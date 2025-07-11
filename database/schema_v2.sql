-- Trade Journal Pro - MySQL Database Schema
-- Designed for scalability up to 100,000+ users
-- Version: 2.0
-- Last Updated: 2025-01-08
-- Set default character set and collation
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
-- Create database
CREATE DATABASE IF NOT EXISTS trade_journal_pro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trade_journal_pro;
-- =============================================
-- USER MANAGEMENT TABLES
-- =============================================
-- Users table (authentication and basic info)
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified_at TIMESTAMP NULL,
    role ENUM('user', 'admin', 'moderator') DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended', 'deleted') DEFAULT 'active',
    last_login_at TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_last_login (last_login_at)
) ENGINE = InnoDB;
-- User profiles table (extended user information)
CREATE TABLE user_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150) NULL,
    phone VARCHAR(20) NULL,
    birthday DATE NULL,
    bio TEXT NULL,
    avatar_url VARCHAR(500) NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_profile (user_id),
    INDEX idx_name (first_name, last_name),
    INDEX idx_display_name (display_name),
    FULLTEXT KEY ft_bio (bio)
) ENGINE = InnoDB;
-- User addresses table
CREATE TABLE user_addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    address_type ENUM('home', 'business', 'billing', 'shipping') DEFAULT 'home',
    street_address VARCHAR(255) NULL,
    address_line_2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state_province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country VARCHAR(100) NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, address_type),
    INDEX idx_country (country),
    INDEX idx_primary (is_primary)
) ENGINE = InnoDB;
-- Trading profiles table (trading-specific information)
CREATE TABLE trading_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    trading_experience ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'beginner',
    risk_tolerance ENUM(
        'conservative',
        'moderate',
        'aggressive',
        'very_aggressive'
    ) DEFAULT 'moderate',
    preferred_markets JSON NULL,
    -- ['stocks', 'forex', 'futures', 'crypto', 'options']
    investment_goals TEXT NULL,
    trading_style ENUM(
        'scalping',
        'day_trading',
        'swing_trading',
        'position_trading',
        'algorithmic'
    ) NULL,
    account_size_range ENUM(
        '0-1k',
        '1k-10k',
        '10k-50k',
        '50k-100k',
        '100k-500k',
        '500k+'
    ) NULL,
    primary_broker VARCHAR(100) NULL,
    favorite_instruments JSON NULL,
    trading_hours JSON NULL,
    -- preferred trading hours
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_trading (user_id),
    INDEX idx_experience (trading_experience),
    INDEX idx_risk_tolerance (risk_tolerance),
    INDEX idx_trading_style (trading_style)
) ENGINE = InnoDB;
-- =============================================
-- TRADING DATA TABLES
-- =============================================
-- Trading accounts table
CREATE TABLE trading_accounts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    broker VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NULL,
    account_type ENUM('demo', 'live', 'paper') DEFAULT 'demo',
    base_currency VARCHAR(3) DEFAULT 'USD',
    initial_balance DECIMAL(15, 2) DEFAULT 0.00,
    current_balance DECIMAL(15, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_account (user_id, account_name),
    INDEX idx_broker (broker),
    INDEX idx_account_type (account_type),
    INDEX idx_active (is_active)
) ENGINE = InnoDB;
-- Trades table (partitioned by date for performance)
CREATE TABLE trades (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    trade_id VARCHAR(100) NULL,
    -- external trade ID
    instrument VARCHAR(100) NOT NULL,
    instrument_type ENUM(
        'stock',
        'forex',
        'future',
        'option',
        'crypto',
        'commodity'
    ) NOT NULL,
    direction ENUM('long', 'short') NOT NULL,
    quantity DECIMAL(15, 4) NOT NULL,
    entry_price DECIMAL(15, 6) NOT NULL,
    exit_price DECIMAL(15, 6) NULL,
    stop_loss DECIMAL(15, 6) NULL,
    take_profit DECIMAL(15, 6) NULL,
    entry_date DATETIME NOT NULL,
    exit_date DATETIME NULL,
    status ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
    pnl DECIMAL(15, 2) DEFAULT 0.00,
    commission DECIMAL(15, 2) DEFAULT 0.00,
    swap DECIMAL(15, 2) DEFAULT 0.00,
    strategy VARCHAR(100) NULL,
    setup_type VARCHAR(100) NULL,
    market_condition VARCHAR(100) NULL,
    notes TEXT NULL,
    tags JSON NULL,
    risk_reward_ratio DECIMAL(5, 2) NULL,
    win_rate DECIMAL(5, 2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, entry_date),
    INDEX idx_instrument (instrument),
    INDEX idx_instrument_type (instrument_type),
    INDEX idx_status (status),
    INDEX idx_strategy (strategy),
    INDEX idx_pnl (pnl),
    INDEX idx_entry_date (entry_date),
    INDEX idx_exit_date (exit_date),
    FULLTEXT KEY ft_notes (notes)
) ENGINE = InnoDB PARTITION BY RANGE (YEAR(entry_date)) (
    PARTITION p2024
    VALUES LESS THAN (2025),
        PARTITION p2025
    VALUES LESS THAN (2026),
        PARTITION p2026
    VALUES LESS THAN (2027),
        PARTITION p2027
    VALUES LESS THAN (2028),
        PARTITION p_future
    VALUES LESS THAN MAXVALUE
);
-- Trade templates table (for quick fill functionality)
CREATE TABLE trade_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    instrument VARCHAR(100) NULL,
    instrument_type ENUM(
        'stock',
        'forex',
        'future',
        'option',
        'crypto',
        'commodity'
    ) NULL,
    direction ENUM('long', 'short') NULL,
    quantity DECIMAL(15, 4) NULL,
    stop_loss_pips DECIMAL(8, 2) NULL,
    take_profit_pips DECIMAL(8, 2) NULL,
    strategy VARCHAR(100) NULL,
    setup_type VARCHAR(100) NULL,
    market_condition VARCHAR(100) NULL,
    notes TEXT NULL,
    tags JSON NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_template (user_id, template_name),
    INDEX idx_favorite (is_favorite),
    INDEX idx_usage (usage_count)
) ENGINE = InnoDB;
-- Trade images/screenshots table
CREATE TABLE trade_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trade_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_type ENUM('chart', 'analysis', 'other') DEFAULT 'chart',
    caption TEXT NULL,
    file_size INT NULL,
    mime_type VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_trade_image (trade_id),
    INDEX idx_user_image (user_id),
    INDEX idx_image_type (image_type)
) ENGINE = InnoDB;
-- =============================================
-- ANALYTICS AND REPORTING TABLES
-- =============================================
-- Daily performance summary table
CREATE TABLE daily_performance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    date DATE NOT NULL,
    trades_count INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    gross_profit DECIMAL(15, 2) DEFAULT 0.00,
    gross_loss DECIMAL(15, 2) DEFAULT 0.00,
    net_pnl DECIMAL(15, 2) DEFAULT 0.00,
    commission_paid DECIMAL(15, 2) DEFAULT 0.00,
    win_rate DECIMAL(5, 2) DEFAULT 0.00,
    profit_factor DECIMAL(8, 4) DEFAULT 0.00,
    max_drawdown DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_account_date (user_id, account_id, date),
    INDEX idx_date (date),
    INDEX idx_user_date (user_id, date)
) ENGINE = InnoDB;
-- Monthly performance summary table
CREATE TABLE monthly_performance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    account_id BIGINT UNSIGNED NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    trades_count INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    gross_profit DECIMAL(15, 2) DEFAULT 0.00,
    gross_loss DECIMAL(15, 2) DEFAULT 0.00,
    net_pnl DECIMAL(15, 2) DEFAULT 0.00,
    commission_paid DECIMAL(15, 2) DEFAULT 0.00,
    win_rate DECIMAL(5, 2) DEFAULT 0.00,
    profit_factor DECIMAL(8, 4) DEFAULT 0.00,
    max_drawdown DECIMAL(15, 2) DEFAULT 0.00,
    sharpe_ratio DECIMAL(8, 4) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_account_period (user_id, account_id, year, month),
    INDEX idx_year_month (year, month),
    INDEX idx_user_period (user_id, year, month)
) ENGINE = InnoDB;
-- =============================================
-- SUBSCRIPTION AND BILLING TABLES
-- =============================================
-- Subscription plans table
CREATE TABLE subscription_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle ENUM('monthly', 'quarterly', 'annually') DEFAULT 'monthly',
    features JSON NULL,
    max_trades_per_month INT DEFAULT 0,
    -- 0 = unlimited
    max_accounts INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active),
    INDEX idx_sort (sort_order)
) ENGINE = InnoDB;
-- User subscriptions table
CREATE TABLE user_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active', 'cancelled', 'expired', 'suspended') DEFAULT 'active',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at DATETIME NULL,
    trial_start DATETIME NULL,
    trial_end DATETIME NULL,
    stripe_subscription_id VARCHAR(100) NULL,
    stripe_customer_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    INDEX idx_user_subscription (user_id, status),
    INDEX idx_stripe_subscription (stripe_subscription_id),
    INDEX idx_stripe_customer (stripe_customer_id),
    INDEX idx_period_end (current_period_end)
) ENGINE = InnoDB;
-- Payment methods table
CREATE TABLE payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    stripe_payment_method_id VARCHAR(100) NOT NULL,
    type ENUM('card', 'bank_account', 'paypal') DEFAULT 'card',
    last_four VARCHAR(4) NULL,
    brand VARCHAR(50) NULL,
    exp_month INT NULL,
    exp_year INT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_payment (user_id),
    INDEX idx_stripe_method (stripe_payment_method_id),
    INDEX idx_default (is_default)
) ENGINE = InnoDB;
-- Invoices table
CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    subscription_id BIGINT UNSIGNED NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    status ENUM('draft', 'sent', 'paid', 'failed', 'refunded') DEFAULT 'draft',
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NULL,
    paid_at DATETIME NULL,
    stripe_invoice_id VARCHAR(100) NULL,
    stripe_payment_intent_id VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id),
    INDEX idx_user_invoice (user_id, status),
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_stripe_invoice (stripe_invoice_id),
    INDEX idx_due_date (due_date)
) ENGINE = InnoDB;
-- =============================================
-- SYSTEM AND AUDIT TABLES
-- =============================================
-- User activity log
CREATE TABLE user_activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_activity (user_id, created_at),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE = InnoDB;
-- System settings table
CREATE TABLE system_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    description TEXT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
) ENGINE = InnoDB;
-- =============================================
-- TRIGGERS AND STORED PROCEDURES
-- =============================================
-- Trigger to update daily performance when trades are inserted/updated
DELIMITER // CREATE TRIGGER update_daily_performance_after_trade
AFTER
INSERT ON trades FOR EACH ROW BEGIN
INSERT INTO daily_performance (user_id, account_id, date, trades_count, net_pnl)
VALUES (
        NEW.user_id,
        NEW.account_id,
        DATE(NEW.entry_date),
        1,
        NEW.pnl
    ) ON DUPLICATE KEY
UPDATE trades_count = trades_count + 1,
    net_pnl = net_pnl + NEW.pnl,
    updated_at = CURRENT_TIMESTAMP;
END // DELIMITER;
-- Stored procedure to calculate monthly performance
DELIMITER // CREATE PROCEDURE CalculateMonthlyPerformance(
    IN p_user_id BIGINT UNSIGNED,
    IN p_year INT,
    IN p_month INT
) BEGIN
DECLARE v_trades_count INT DEFAULT 0;
DECLARE v_winning_trades INT DEFAULT 0;
DECLARE v_losing_trades INT DEFAULT 0;
DECLARE v_gross_profit DECIMAL(15, 2) DEFAULT 0.00;
DECLARE v_gross_loss DECIMAL(15, 2) DEFAULT 0.00;
DECLARE v_net_pnl DECIMAL(15, 2) DEFAULT 0.00;
DECLARE v_commission DECIMAL(15, 2) DEFAULT 0.00;
DECLARE v_win_rate DECIMAL(5, 2) DEFAULT 0.00;
-- Calculate statistics
SELECT COUNT(*),
    SUM(
        CASE
            WHEN pnl > 0 THEN 1
            ELSE 0
        END
    ),
    SUM(
        CASE
            WHEN pnl < 0 THEN 1
            ELSE 0
        END
    ),
    SUM(
        CASE
            WHEN pnl > 0 THEN pnl
            ELSE 0
        END
    ),
    SUM(
        CASE
            WHEN pnl < 0 THEN pnl
            ELSE 0
        END
    ),
    SUM(pnl),
    SUM(commission) INTO v_trades_count,
    v_winning_trades,
    v_losing_trades,
    v_gross_profit,
    v_gross_loss,
    v_net_pnl,
    v_commission
FROM trades
WHERE user_id = p_user_id
    AND YEAR(entry_date) = p_year
    AND MONTH(entry_date) = p_month
    AND status = 'closed';
-- Calculate win rate
IF v_trades_count > 0 THEN
SET v_win_rate = (v_winning_trades / v_trades_count) * 100;
END IF;
-- Insert or update monthly performance
INSERT INTO monthly_performance (
        user_id,
        account_id,
        year,
        month,
        trades_count,
        winning_trades,
        losing_trades,
        gross_profit,
        gross_loss,
        net_pnl,
        commission_paid,
        win_rate
    )
VALUES (
        p_user_id,
        1,
        p_year,
        p_month,
        v_trades_count,
        v_winning_trades,
        v_losing_trades,
        v_gross_profit,
        v_gross_loss,
        v_net_pnl,
        v_commission,
        v_win_rate
    ) ON DUPLICATE KEY
UPDATE trades_count = v_trades_count,
    winning_trades = v_winning_trades,
    losing_trades = v_losing_trades,
    gross_profit = v_gross_profit,
    gross_loss = v_gross_loss,
    net_pnl = v_net_pnl,
    commission_paid = v_commission,
    win_rate = v_win_rate,
    updated_at = CURRENT_TIMESTAMP;
END // DELIMITER;
-- =============================================
-- INITIAL DATA SETUP
-- =============================================
-- Insert default subscription plans
INSERT INTO subscription_plans (
        name,
        slug,
        description,
        price,
        billing_cycle,
        features,
        max_trades_per_month,
        max_accounts
    )
VALUES (
        'Basic',
        'basic',
        'Perfect for beginners',
        9.99,
        'monthly',
        '["Trade logging", "Basic analytics", "Email support"]',
        100,
        1
    ),
    (
        'Pro',
        'pro',
        'For serious traders',
        19.99,
        'monthly',
        '["Unlimited trades", "Advanced analytics", "Priority support", "Export features"]',
        0,
        3
    ),
    (
        'Enterprise',
        'enterprise',
        'For trading teams',
        49.99,
        'monthly',
        '["Everything in Pro", "Team collaboration", "Custom integrations", "Phone support"]',
        0,
        10
    );
-- Insert default system settings
INSERT INTO system_settings (
        setting_key,
        setting_value,
        description,
        is_public
    )
VALUES (
        'app_name',
        'Trade Journal Pro',
        'Application name',
        true
    ),
    (
        'app_version',
        '2.0.0',
        'Current application version',
        true
    ),
    (
        'maintenance_mode',
        'false',
        'Enable maintenance mode',
        false
    ),
    (
        'max_file_upload_size',
        '10485760',
        'Maximum file upload size in bytes (10MB)',
        false
    ),
    (
        'supported_currencies',
        '["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]',
        'Supported currencies',
        true
    );
-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================
-- View for user complete profile
CREATE VIEW user_complete_profile AS
SELECT u.id,
    u.email,
    u.role,
    u.status,
    u.created_at,
    u.last_login_at,
    up.first_name,
    up.last_name,
    up.display_name,
    up.phone,
    up.birthday,
    up.bio,
    up.timezone,
    up.language,
    up.currency,
    tp.trading_experience,
    tp.risk_tolerance,
    tp.preferred_markets,
    tp.investment_goals,
    tp.trading_style,
    us.status AS subscription_status,
    sp.name AS subscription_plan
FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN trading_profiles tp ON u.id = tp.user_id
    LEFT JOIN user_subscriptions us ON u.id = us.user_id
    AND us.status = 'active'
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id;
-- View for trading performance summary
CREATE VIEW trading_performance_summary AS
SELECT t.user_id,
    COUNT(*) as total_trades,
    SUM(
        CASE
            WHEN t.pnl > 0 THEN 1
            ELSE 0
        END
    ) as winning_trades,
    SUM(
        CASE
            WHEN t.pnl < 0 THEN 1
            ELSE 0
        END
    ) as losing_trades,
    SUM(t.pnl) as net_pnl,
    SUM(t.commission) as total_commission,
    AVG(
        CASE
            WHEN t.pnl > 0 THEN t.pnl
            ELSE NULL
        END
    ) as avg_win,
    AVG(
        CASE
            WHEN t.pnl < 0 THEN t.pnl
            ELSE NULL
        END
    ) as avg_loss,
    (
        SUM(
            CASE
                WHEN t.pnl > 0 THEN 1
                ELSE 0
            END
        ) / COUNT(*)
    ) * 100 as win_rate
FROM trades t
WHERE t.status = 'closed'
GROUP BY t.user_id;
-- Enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
-- =============================================
-- MAINTENANCE AND OPTIMIZATION
-- =============================================
-- Create events for automatic data cleanup (requires EVENT_SCHEDULER=ON)
-- Clean up old user activity logs (keep last 6 months)
CREATE EVENT IF NOT EXISTS cleanup_old_activity_logs ON SCHEDULE EVERY 1 WEEK DO
DELETE FROM user_activity_log
WHERE created_at < DATE_SUB(NOW(), INTERVAL 6 MONTH);
-- Archive old trades (move to archive table after 2 years)
CREATE EVENT IF NOT EXISTS archive_old_trades ON SCHEDULE EVERY 1 MONTH DO BEGIN -- This would typically move data to an archive table
-- For now, we'll just add a comment
-- Archive trades older than 2 years
UPDATE trades
SET notes = CONCAT(IFNULL(notes, ''), '[ARCHIVED]')
WHERE entry_date < DATE_SUB(NOW(), INTERVAL 2 YEAR);
END;
-- =============================================
-- SECURITY CONSIDERATIONS
-- =============================================
-- Create dedicated database users with limited permissions
-- CREATE USER 'tradejournalpro_app'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON trade_journal_pro.* TO 'tradejournalpro_app'@'localhost';
-- CREATE USER 'tradejournalpro_readonly'@'localhost' IDENTIFIED BY 'readonly_password_here';
-- GRANT SELECT ON trade_journal_pro.* TO 'tradejournalpro_readonly'@'localhost';
-- =============================================
-- PERFORMANCE OPTIMIZATION NOTES
-- =============================================
-- For 100,000+ users, consider:
-- 1. Database sharding by user_id
-- 2. Read replicas for analytics queries
-- 3. Caching frequently accessed data (Redis/Memcached)
-- 4. Regular OPTIMIZE TABLE operations
-- 5. Monitor and optimize slow queries
-- 6. Consider NoSQL for high-volume activity logs
-- 7. Implement connection pooling
-- 8. Use prepared statements to prevent SQL injection
-- 9. Regular backups and disaster recovery procedures
-- Example optimization query for large datasets:
-- OPTIMIZE TABLE trades;
-- ANALYZE TABLE trades;
-- Index maintenance (run periodically)
-- REPAIR TABLE trades;
-- CHECK TABLE trades;