# Trade Journal Pro - Setup Guide

## Recent Improvements

### 1. Horizontal Layout Optimization

- **Calendar View**: Enhanced to use 4-column grid on XL screens (3 columns for calendar, 1 for P&L summary)
- **Sticky P&L Panel**: The P&L summary panel now stays visible when scrolling
- **Better Space Utilization**: More efficient use of screen real estate for wider displays

### 2. Simplified Template Creation

- **One Template Only**: When creating a new template, all existing custom templates are automatically removed
- **Clean Template Management**: Ensures users focus on one custom template at a time
- **Clear User Feedback**: Users are notified when templates are replaced

### 3. Enhanced Calendar View

- **Color-Coded Days**:
  - Light green background for profitable days
  - Light red background for losing days
  - Blue for days with open trades only
- **Prominent P&L Display**: Daily P&L shown as bold numbers in colored boxes
- **Simplified Win/Loss Indicators**: Compact "3W|2L" format for better readability
- **Better Visual Hierarchy**: Important information (P&L, counts) emphasized

### 4. Sample Data for Testing

- **Pre-loaded Trades**: Added sample trades with various scenarios (wins, losses, open positions)
- **Realistic Data**: Includes popular stocks (AAPL, TSLA, MSFT, GOOGL, NVDA) with realistic prices
- **Multiple Strategies**: Demonstrates different trading strategies and setups

## Simplified Registration Flow (Development Mode)

This system has been simplified for development purposes. The current flow includes:

1. **Account Creation** - Users create their account with basic information
2. **Email Verification** - Users verify their email address
3. **Direct Access** - Users can immediately access the platform after email verification

**Note**: The trial system and payment method validation have been temporarily disabled for development. These features will be re-enabled before publishing.

## System Architecture

### Frontend Components

- `MultiStepRegistration.jsx` - Main registration flow (2 steps: account + email)
- `EmailVerification.jsx` - Email verification component
- `PaymentMethodForm.jsx` - Credit card validation form (disabled for dev)
- `TrialActivation.jsx` - Trial activation component (disabled for dev)
- Updated `AuthContext.jsx` - Simplified authentication for development
- Updated `ProtectedRoute.jsx` - Simplified access control for development

### Backend API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/send-verification` - Send email verification
- `POST /api/auth/verify-email` - Verify email token
- `POST /api/user/payment-methods` - Add and verify payment method (not used in dev)
- `POST /api/user/start-trial` - Start 7-day trial (not used in dev)
- `GET /api/user/access-check` - Check user access status (simplified in dev)

### Database Schema

- `users` - User accounts with email verification status
- `user_account_requirements` - Track completion of registration steps
- `email_verification_tokens` - Email verification tokens
- `user_payment_methods` - Stored payment methods (for future use)
- `payment_transactions` - Payment transactions (for future use)
- `user_trials` - Trial management (for future use)
- `subscription_plans` - Including 7-day trial plan (for future use)

## Registration Flow (Development Mode)

### Step 1: Account Creation

- User enters first name, last name, email, password
- Account is created with `status='pending'`
- Email verification token is generated and sent

### Step 2: Email Verification

- User receives email with verification link
- Clicking link verifies email and updates `email_verified=true`
- User can resend verification email if needed
- After verification, user is redirected to dashboard

### Removed Steps (For Development)

- **Payment Method Validation** - Temporarily disabled
- **Trial Activation** - Temporarily disabled
- **Strict Access Control** - Temporarily disabled
- User enters credit card information
- $1 verification charge is processed via Stripe
- Charge is immediately refunded
- Payment method is stored and marked as verified

### Step 4: Trial Activation

- 7-day trial is created and activated
- User gets full access to all Pro features
- Trial expires after 7 days

## Access Control

Users cannot access the main platform until:

- ✅ Email is verified
- ✅ Payment method is added and verified
- ✅ Trial is activated

The `ProtectedRoute` component enforces these requirements and redirects users to complete missing steps.

## Trial Management

### Trial Features

- 7-day duration from activation
- Full access to all Pro features
- No charges during trial period
- Automatic expiration after 7 days

### Post-Trial

- Users must subscribe to continue access
- Expired trials redirect to billing page
- All data is retained for conversion

## Environment Variables

```bash
# Database
DB_HOST=localhost
DB_USER=tradejournalpro_app
DB_PASSWORD=your_secure_password
DB_NAME=trade_journal

# JWT
JWT_SECRET=your-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@tradejournalpro.com

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Development Setup

1. Install dependencies:

```bash
npm install
```

2. Set up MySQL database:

```bash
# Create database and run schema
mysql -u root -p < database/schema.sql
```

3. Start the backend server:

```bash
# In a separate terminal
node database/api-endpoints.js
```

4. Start the frontend:

```bash
npm run dev
```

## Testing the Flow

1. Visit `/register` to start registration
2. Fill out the account creation form
3. Check email for verification link
4. Add a test credit card (use Stripe test cards)
5. Activate the 7-day trial
6. Access the main platform

## Security Features

- Email verification prevents fake accounts
- Payment method validation reduces fraud
- JWT tokens for session management
- Secure password hashing
- Input validation on all forms
- Rate limiting on API endpoints

## Stripe Integration

The system uses Stripe for payment processing:

- Payment methods are stored securely
- $1 verification charges are automatically refunded
- Subscription billing is ready for post-trial conversion
- PCI compliance through Stripe

## Database Scalability

The schema is designed for 100,000+ users with:

- Proper indexing on all lookup fields
- Partitioning strategies for large tables
- Stored procedures for complex operations
- Audit logging for compliance

## Future Enhancements

- Two-factor authentication
- Social login integration
- Advanced trial analytics
- A/B testing for conversion optimization
- Mobile app support
- Advanced fraud detection

## Support

For questions or issues:

- Check the API documentation in `database/README.md`
- Review the database schema in `database/schema.sql`
- Test endpoints are available in `database/api-endpoints.js`
