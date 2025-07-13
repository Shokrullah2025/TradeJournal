/* 
Trade Journal Pro - Backend API Endpoints
Example implementations for connecting frontend to MySQL database

These are example Node.js/Express endpoints that would handle the frontend profile updates
and integrate with the MySQL database schema.

Install required dependencies:
npm install express mysql2 bcryptjs jsonwebtoken cors helmet express-rate-limit multer nodemailer stripe
*/

const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", apiLimiter);

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/profiles");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${fileExtension}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "tradejournalpro_app",
  password: process.env.DB_PASSWORD || "your_secure_password",
  database: process.env.DB_NAME || "trade_journal_pro",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// =============================================
// USER PROFILE ENDPOINTS
// =============================================

// Get user profile
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `
      SELECT 
        u.id, u.email, u.role, u.status, u.created_at, u.last_login_at,
        up.first_name, up.last_name, up.display_name, up.phone, up.birthday,
        up.bio, up.avatar_url, up.timezone, up.language, up.currency,
        tp.trading_experience, tp.risk_tolerance, tp.preferred_markets,
        tp.investment_goals, tp.trading_style, tp.account_size_range,
        tp.primary_broker, tp.favorite_instruments, tp.trading_hours,
        ua.street_address, ua.address_line_2, ua.city, ua.state_province,
        ua.postal_code, ua.country
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN trading_profiles tp ON u.id = tp.user_id
      LEFT JOIN user_addresses ua ON u.id = ua.user_id AND ua.is_primary = TRUE
      WHERE u.id = ?
    `,
      [req.user.id]
    );

    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];

    // Parse JSON fields
    if (user.preferred_markets) {
      user.preferred_markets = JSON.parse(user.preferred_markets);
    }
    if (user.favorite_instruments) {
      user.favorite_instruments = JSON.parse(user.favorite_instruments);
    }
    if (user.trading_hours) {
      user.trading_hours = JSON.parse(user.trading_hours);
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user profile
app.put("/api/user/profile", authenticateToken, async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    birthday,
    bio,
    timezone,
    language,
    currency,
    tradingExperience,
    riskTolerance,
    preferredMarkets,
    investmentGoals,
    tradingStyle,
    accountSizeRange,
    primaryBroker,
    favoriteInstruments,
    tradingHours,
    address,
    addressLine2,
    city,
    state,
    zipCode,
    country,
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update user table
    if (email) {
      await connection.execute(
        "UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?",
        [email, req.user.id]
      );
    }

    // Update or insert user profile
    await connection.execute(
      `
      INSERT INTO user_profiles (
        user_id, first_name, last_name, phone, birthday, bio, timezone, language, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        phone = VALUES(phone),
        birthday = VALUES(birthday),
        bio = VALUES(bio),
        timezone = VALUES(timezone),
        language = VALUES(language),
        currency = VALUES(currency),
        updated_at = NOW()
    `,
      [
        req.user.id,
        firstName,
        lastName,
        phone,
        birthday,
        bio,
        timezone,
        language,
        currency,
      ]
    );

    // Update or insert trading profile
    if (
      tradingExperience ||
      riskTolerance ||
      preferredMarkets ||
      investmentGoals
    ) {
      await connection.execute(
        `
        INSERT INTO trading_profiles (
          user_id, trading_experience, risk_tolerance, preferred_markets, 
          investment_goals, trading_style, account_size_range, primary_broker,
          favorite_instruments, trading_hours
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          trading_experience = VALUES(trading_experience),
          risk_tolerance = VALUES(risk_tolerance),
          preferred_markets = VALUES(preferred_markets),
          investment_goals = VALUES(investment_goals),
          trading_style = VALUES(trading_style),
          account_size_range = VALUES(account_size_range),
          primary_broker = VALUES(primary_broker),
          favorite_instruments = VALUES(favorite_instruments),
          trading_hours = VALUES(trading_hours),
          updated_at = NOW()
      `,
        [
          req.user.id,
          tradingExperience,
          riskTolerance,
          JSON.stringify(preferredMarkets),
          investmentGoals,
          tradingStyle,
          accountSizeRange,
          primaryBroker,
          JSON.stringify(favoriteInstruments),
          JSON.stringify(tradingHours),
        ]
      );
    }

    // Update or insert address
    if (address || city || state || zipCode || country) {
      await connection.execute(
        `
        INSERT INTO user_addresses (
          user_id, address_type, street_address, address_line_2, city, 
          state_province, postal_code, country, is_primary
        ) VALUES (?, 'home', ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          street_address = VALUES(street_address),
          address_line_2 = VALUES(address_line_2),
          city = VALUES(city),
          state_province = VALUES(state_province),
          postal_code = VALUES(postal_code),
          country = VALUES(country),
          updated_at = NOW()
      `,
        [req.user.id, address, addressLine2, city, state, zipCode, country]
      );
    }

    // Log user activity
    await connection.execute(
      `
      INSERT INTO user_activity_log (user_id, action, details, ip_address)
      VALUES (?, 'profile_update', ?, ?)
    `,
      [
        req.user.id,
        JSON.stringify({ fields_updated: Object.keys(req.body) }),
        req.ip,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Profile updated successfully",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  } finally {
    connection.release();
  }
});

// Upload profile picture
app.post(
  "/api/user/profile/picture",
  authenticateToken,
  upload.single("profilePicture"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const connection = await pool.getConnection();

    try {
      // Get current profile picture to delete old one
      const [currentProfile] = await connection.execute(
        "SELECT avatar_url FROM user_profiles WHERE user_id = ?",
        [req.user.id]
      );

      const avatarUrl = `/uploads/profiles/${req.file.filename}`;

      // Update profile with new avatar URL
      await connection.execute(
        `
      INSERT INTO user_profiles (user_id, avatar_url) 
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE 
        avatar_url = VALUES(avatar_url),
        updated_at = NOW()
    `,
        [req.user.id, avatarUrl]
      );

      // Delete old profile picture if it exists
      if (currentProfile.length > 0 && currentProfile[0].avatar_url) {
        const oldFilePath = path.join(
          __dirname,
          "../",
          currentProfile[0].avatar_url
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Log user activity
      await connection.execute(
        `
      INSERT INTO user_activity_log (user_id, action, details, ip_address)
      VALUES (?, 'profile_picture_update', ?, ?)
    `,
        [req.user.id, JSON.stringify({ new_avatar: avatarUrl }), req.ip]
      );

      connection.release();

      res.json({
        success: true,
        message: "Profile picture updated successfully",
        avatarUrl: avatarUrl,
      });
    } catch (error) {
      // Delete uploaded file if database operation failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      connection.release();
      console.error("Error updating profile picture:", error);
      res.status(500).json({ error: "Failed to update profile picture" });
    }
  }
);

// Delete profile picture
app.delete("/api/user/profile/picture", authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    // Get current profile picture
    const [currentProfile] = await connection.execute(
      "SELECT avatar_url FROM user_profiles WHERE user_id = ?",
      [req.user.id]
    );

    if (currentProfile.length === 0 || !currentProfile[0].avatar_url) {
      connection.release();
      return res.status(404).json({ error: "No profile picture found" });
    }

    const avatarUrl = currentProfile[0].avatar_url;

    // Remove avatar URL from profile
    await connection.execute(
      "UPDATE user_profiles SET avatar_url = NULL, updated_at = NOW() WHERE user_id = ?",
      [req.user.id]
    );

    // Delete file from filesystem
    const filePath = path.join(__dirname, "../", avatarUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Log user activity
    await connection.execute(
      `
      INSERT INTO user_activity_log (user_id, action, details, ip_address)
      VALUES (?, 'profile_picture_delete', ?, ?)
    `,
      [req.user.id, JSON.stringify({ deleted_avatar: avatarUrl }), req.ip]
    );

    connection.release();

    res.json({
      success: true,
      message: "Profile picture deleted successfully",
    });
  } catch (error) {
    connection.release();
    console.error("Error deleting profile picture:", error);
    res.status(500).json({ error: "Failed to delete profile picture" });
  }
});

// =============================================
// TRADE ENDPOINTS
// =============================================

// Get user trades
app.get("/api/user/trades", authenticateToken, async (req, res) => {
  const { page = 1, limit = 50, start_date, end_date, status } = req.query;
  const offset = (page - 1) * limit;

  try {
    const connection = await pool.getConnection();

    let whereClause = "WHERE user_id = ?";
    const params = [req.user.id];

    if (start_date) {
      whereClause += " AND entry_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      whereClause += " AND entry_date <= ?";
      params.push(end_date);
    }
    if (status) {
      whereClause += " AND status = ?";
      params.push(status);
    }

    const [rows] = await connection.execute(
      `
      SELECT * FROM trades 
      ${whereClause}
      ORDER BY entry_date DESC
      LIMIT ? OFFSET ?
    `,
      [...params, parseInt(limit), offset]
    );

    const [countResult] = await connection.execute(
      `
      SELECT COUNT(*) as total FROM trades ${whereClause}
    `,
      params
    );

    connection.release();

    res.json({
      trades: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create new trade
app.post("/api/user/trades", authenticateToken, async (req, res) => {
  const {
    instrument,
    instrumentType,
    direction,
    quantity,
    entryPrice,
    stopLoss,
    takeProfit,
    entryDate,
    strategy,
    setupType,
    marketCondition,
    notes,
    tags,
  } = req.body;

  try {
    const connection = await pool.getConnection();

    // Get or create default trading account
    let [accounts] = await connection.execute(
      "SELECT id FROM trading_accounts WHERE user_id = ? AND is_active = TRUE LIMIT 1",
      [req.user.id]
    );

    let accountId;
    if (accounts.length === 0) {
      // Create default account
      const [result] = await connection.execute(
        `
        INSERT INTO trading_accounts (user_id, account_name, broker, account_type)
        VALUES (?, 'Default Account', 'Unknown', 'demo')
      `,
        [req.user.id]
      );
      accountId = result.insertId;
    } else {
      accountId = accounts[0].id;
    }

    // Insert trade
    const [result] = await connection.execute(
      `
      INSERT INTO trades (
        user_id, account_id, instrument, instrument_type, direction, quantity,
        entry_price, stop_loss, take_profit, entry_date, strategy, setup_type,
        market_condition, notes, tags, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `,
      [
        req.user.id,
        accountId,
        instrument,
        instrumentType,
        direction,
        quantity,
        entryPrice,
        stopLoss,
        takeProfit,
        entryDate,
        strategy,
        setupType,
        marketCondition,
        notes,
        JSON.stringify(tags),
      ]
    );

    connection.release();

    res.status(201).json({
      success: true,
      tradeId: result.insertId,
      message: "Trade created successfully",
    });
  } catch (error) {
    console.error("Error creating trade:", error);
    res.status(500).json({ error: "Failed to create trade" });
  }
});

// Update trade
app.put("/api/user/trades/:id", authenticateToken, async (req, res) => {
  const tradeId = req.params.id;
  const updates = req.body;

  try {
    const connection = await pool.getConnection();

    // Verify trade belongs to user
    const [trades] = await connection.execute(
      "SELECT id FROM trades WHERE id = ? AND user_id = ?",
      [tradeId, req.user.id]
    );

    if (trades.length === 0) {
      connection.release();
      return res.status(404).json({ error: "Trade not found" });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      connection.release();
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(tradeId);

    await connection.execute(
      `
      UPDATE trades SET ${updateFields.join(", ")} WHERE id = ?
    `,
      updateValues
    );

    connection.release();

    res.json({
      success: true,
      message: "Trade updated successfully",
    });
  } catch (error) {
    console.error("Error updating trade:", error);
    res.status(500).json({ error: "Failed to update trade" });
  }
});

// =============================================
// TEMPLATE ENDPOINTS
// =============================================

// Get user templates
app.get("/api/user/templates", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [rows] = await connection.execute(
      `
      SELECT * FROM trade_templates 
      WHERE user_id = ? 
      ORDER BY usage_count DESC, created_at DESC
    `,
      [req.user.id]
    );

    connection.release();

    res.json({ templates: rows });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create template
app.post("/api/user/templates", authenticateToken, async (req, res) => {
  const { templateName, ...templateData } = req.body;

  try {
    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      `
      INSERT INTO trade_templates (user_id, template_name, instrument, instrument_type,
        direction, quantity, strategy, setup_type, market_condition, notes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        req.user.id,
        templateName,
        templateData.instrument,
        templateData.instrumentType,
        templateData.direction,
        templateData.quantity,
        templateData.strategy,
        templateData.setupType,
        templateData.marketCondition,
        templateData.notes,
        JSON.stringify(templateData.tags),
      ]
    );

    connection.release();

    res.status(201).json({
      success: true,
      templateId: result.insertId,
      message: "Template created successfully",
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

// =============================================
// ANALYTICS ENDPOINTS
// =============================================

// Get user performance summary
app.get("/api/user/performance", authenticateToken, async (req, res) => {
  const { period = "30d" } = req.query;

  try {
    const connection = await pool.getConnection();

    let dateFilter = "";
    if (period === "30d") {
      dateFilter = "AND entry_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    } else if (period === "90d") {
      dateFilter = "AND entry_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
    } else if (period === "1y") {
      dateFilter = "AND entry_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)";
    }

    const [rows] = await connection.execute(
      `
      SELECT 
        COUNT(*) as total_trades,
        SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(pnl) as net_pnl,
        AVG(CASE WHEN pnl > 0 THEN pnl ELSE NULL END) as avg_win,
        AVG(CASE WHEN pnl < 0 THEN pnl ELSE NULL END) as avg_loss,
        SUM(commission) as total_commission,
        (SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) / COUNT(*)) * 100 as win_rate
      FROM trades 
      WHERE user_id = ? AND status = 'closed' ${dateFilter}
    `,
      [req.user.id]
    );

    connection.release();

    res.json({ performance: rows[0] });
  } catch (error) {
    console.error("Error fetching performance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// =============================================
// EMAIL VERIFICATION ENDPOINTS
// =============================================

// Send email verification
app.post("/api/auth/send-verification", async (req, res) => {
  const { email } = req.body;

  try {
    const connection = await pool.getConnection();

    // Find user by email
    const [users] = await connection.execute(
      "SELECT id, email, email_verified FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];

    if (user.email_verified) {
      connection.release();
      return res.status(400).json({ error: "Email already verified" });
    }

    // Generate verification token
    const [tokenResult] = await connection.execute(
      "CALL GenerateEmailVerificationToken(?, @token)"
    );

    const [tokenRows] = await connection.execute("SELECT @token as token");
    const verificationToken = tokenRows[0].token;

    connection.release();

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@tradejournalpro.com",
      to: email,
      subject: "Verify Your Email - Trade Journal Pro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Trade Journal Pro!</h1>
          <p>Please verify your email address to complete your registration.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// Verify email token
app.post("/api/auth/verify-email", async (req, res) => {
  const { token } = req.body;

  try {
    const connection = await pool.getConnection();

    // Verify token
    const [result] = await connection.execute(
      "CALL VerifyEmailToken(?, @is_valid, @user_id)"
    );

    const [verifyResult] = await connection.execute(
      "SELECT @is_valid as is_valid, @user_id as user_id"
    );

    const { is_valid, user_id } = verifyResult[0];

    if (!is_valid) {
      connection.release();
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    connection.release();

    res.json({
      success: true,
      message: "Email verified successfully",
      user_id: user_id,
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
});

// =============================================
// PAYMENT METHOD ENDPOINTS
// =============================================

// Add payment method
app.post("/api/user/payment-methods", authenticateToken, async (req, res) => {
  const { payment_method_id, billing_name, billing_email, billing_address } =
    req.body;

  try {
    // Retrieve payment method from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(
      payment_method_id
    );

    if (!paymentMethod || paymentMethod.type !== "card") {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    // Attach payment method to customer (create customer if needed)
    let customerId = req.user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { user_id: req.user.id.toString() },
      });
      customerId = customer.id;

      // Update user with customer ID
      const connection = await pool.getConnection();
      await connection.execute(
        "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
        [customerId, req.user.id]
      );
      connection.release();
    }

    await stripe.paymentMethods.attach(payment_method_id, {
      customer: customerId,
    });

    // Verify payment method with small charge
    const verificationIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 verification charge
      currency: "usd",
      payment_method: payment_method_id,
      customer: customerId,
      confirmation_method: "manual",
      confirm: true,
      description: "Payment method verification",
      metadata: {
        user_id: req.user.id.toString(),
        type: "verification",
      },
    });

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Save payment method to database
      const [pmResult] = await connection.execute(
        `
        INSERT INTO user_payment_methods (
          user_id, stripe_payment_method_id, card_brand, card_last_four,
          card_exp_month, card_exp_year, billing_name, billing_email, 
          billing_address, is_verified, verification_amount_cents, verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [
          req.user.id,
          payment_method_id,
          paymentMethod.card.brand,
          paymentMethod.card.last4,
          paymentMethod.card.exp_month,
          paymentMethod.card.exp_year,
          billing_name,
          billing_email,
          JSON.stringify(billing_address),
          verificationIntent.status === "succeeded",
          100,
        ]
      );

      // Record verification transaction
      await connection.execute(
        `
        INSERT INTO payment_transactions (
          user_id, payment_method_id, stripe_payment_intent_id, 
          transaction_type, amount_cents, status, description
        ) VALUES (?, ?, ?, 'verification', 100, ?, 'Payment method verification')
      `,
        [
          req.user.id,
          pmResult.insertId,
          verificationIntent.id,
          verificationIntent.status,
        ]
      );

      // Update account requirements
      await connection.execute(
        `
        UPDATE user_account_requirements 
        SET payment_method_added = TRUE, 
            payment_method_verified = ?, 
            payment_verified_at = ?
        WHERE user_id = ?
      `,
        [
          verificationIntent.status === "succeeded",
          verificationIntent.status === "succeeded" ? new Date() : null,
          req.user.id,
        ]
      );

      await connection.commit();

      // Refund the verification charge immediately
      if (verificationIntent.status === "succeeded") {
        await stripe.refunds.create({
          payment_intent: verificationIntent.id,
          reason: "requested_by_customer",
          metadata: { type: "verification_refund" },
        });
      }

      res.json({
        success: true,
        message: "Payment method added and verified successfully",
        verified: verificationIntent.status === "succeeded",
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error adding payment method:", error);
    res.status(500).json({ error: "Failed to add payment method" });
  }
});

// Check user access eligibility
app.get("/api/user/access-check", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Check user access
    const [result] = await connection.execute(
      "CALL CheckUserAccess(?, @can_access)"
    );

    const [accessResult] = await connection.execute(
      "SELECT @can_access as can_access"
    );

    // Get detailed requirements
    const [requirements] = await connection.execute(
      `
      SELECT 
        email_verified,
        payment_method_added,
        payment_method_verified,
        can_access_platform,
        onboarding_completed
      FROM user_account_requirements 
      WHERE user_id = ?
    `,
      [req.user.id]
    );

    // Get trial status
    const [trialStatus] = await connection.execute(
      `
      SELECT 
        status,
        ends_at,
        DATEDIFF(ends_at, NOW()) as days_remaining
      FROM user_trials 
      WHERE user_id = ? AND status = 'active'
    `,
      [req.user.id]
    );

    connection.release();

    res.json({
      can_access: accessResult[0].can_access === 1,
      requirements: requirements[0] || {},
      trial: trialStatus[0] || null,
    });
  } catch (error) {
    console.error("Error checking user access:", error);
    res.status(500).json({ error: "Failed to check user access" });
  }
});

// =============================================
// TRIAL MANAGEMENT ENDPOINTS
// =============================================

// Start trial (called during registration)
app.post("/api/user/start-trial", authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Check if user already has a trial
    const [existingTrial] = await connection.execute(
      "SELECT id FROM user_trials WHERE user_id = ?",
      [req.user.id]
    );

    if (existingTrial.length > 0) {
      connection.release();
      return res
        .status(400)
        .json({ error: "Trial already exists for this user" });
    }

    // Create trial
    await connection.execute("CALL CreateUserTrial(?)", [req.user.id]);

    connection.release();

    res.json({
      success: true,
      message: "7-day trial started successfully",
      trial_ends: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Error starting trial:", error);
    res.status(500).json({ error: "Failed to start trial" });
  }
});

// Convert trial to paid subscription
app.post("/api/user/convert-trial", authenticateToken, async (req, res) => {
  const { plan_id, payment_method_id } = req.body;

  try {
    const connection = await pool.getConnection();

    // Get plan details
    const [plans] = await connection.execute(
      "SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE",
      [plan_id]
    );

    if (plans.length === 0) {
      connection.release();
      return res.status(404).json({ error: "Plan not found" });
    }

    const plan = plans[0];

    // Create Stripe subscription
    const subscription = await stripe.subscriptions.create({
      customer: req.user.stripe_customer_id,
      items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: plan.name },
            unit_amount: Math.round(plan.price * 100),
            recurring: {
              interval: plan.billing_cycle === "yearly" ? "year" : "month",
            },
          },
        },
      ],
      default_payment_method: payment_method_id,
      metadata: { user_id: req.user.id.toString() },
    });

    await connection.beginTransaction();

    try {
      // Update trial status
      await connection.execute(
        'UPDATE user_trials SET status = "converted", conversion_date = NOW() WHERE user_id = ? AND status = "active"',
        [req.user.id]
      );

      // Create new subscription
      await connection.execute(
        `
        INSERT INTO user_subscriptions (
          user_id, plan_id, status, starts_at, ends_at, 
          auto_renew, stripe_subscription_id
        ) VALUES (?, ?, 'active', NOW(), ?, TRUE, ?)
      `,
        [
          req.user.id,
          plan_id,
          plan.billing_cycle === "yearly"
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subscription.id,
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: "Trial converted to paid subscription successfully",
        subscription_id: subscription.id,
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error converting trial:", error);
    res.status(500).json({ error: "Failed to convert trial" });
  }
});

// =============================================
// ADMIN ENDPOINTS
// =============================================

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {});

    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Get all users with filtering
app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
  const {
    search = "",
    status = "all",
    subscription = "all",
    page = 1,
    limit = 50,
  } = req.query;

  try {
    const connection = await pool.getConnection();
    const offset = (page - 1) * limit;

    const [users] = await connection.execute(
      "CALL GetAdminUserList(?, ?, ?, ?, ?, ?)",
      [req.user.id, search, status, subscription, parseInt(limit), offset]
    );

    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM users WHERE role != "admin"'
    );

    connection.release();

    res.json({
      users: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0]?.total || 0,
        pages: Math.ceil((countResult[0]?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Trade Journal Pro API server running on port ${PORT}`);
});

module.exports = app;
