-- ========================================
-- Trade Journal Database Schema
-- Designed for 100,000+ users with scalability
-- ========================================
-- Create database
CREATE DATABASE IF NOT EXISTS trade_journal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trade_journal;
-- ========================================
-- User Management Tables
-- ========================================
-- Main users table
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin', 'premium') DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45) NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_uuid (uuid),
    INDEX idx_status (status),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at),
    INDEX idx_last_login (last_login_at)
);
-- User profiles table (separated for better performance)
CREATE TABLE user_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    birthday DATE NULL,
    bio TEXT NULL,
    avatar_url VARCHAR(500) NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(5) DEFAULT 'en',
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_full_name (first_name, last_name)
);
-- User addresses table
CREATE TABLE user_addresses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    address_line_1 VARCHAR(255) NULL,
    address_line_2 VARCHAR(255) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country VARCHAR(100) NULL,
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_country (country)
);
-- User trading profiles
CREATE TABLE user_trading_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    trading_experience ENUM('beginner', 'intermediate', 'advanced', 'expert') NULL,
    risk_tolerance ENUM(
        'conservative',
        'moderate',
        'aggressive',
        'very_aggressive'
    ) NULL,
    preferred_markets JSON NULL,
    -- Array of market preferences
    investment_goals TEXT NULL,
    annual_income_range VARCHAR(50) NULL,
    net_worth_range VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_trading_experience (trading_experience),
    INDEX idx_risk_tolerance (risk_tolerance)
);
-- ========================================
-- Session Management
-- ========================================
CREATE TABLE user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
);
-- ========================================
-- Trading Data Tables
-- ========================================
-- Main trades table
CREATE TABLE trades (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    uuid CHAR(36) UNIQUE NOT NULL DEFAULT (UUID()),
    instrument_type ENUM(
        'stocks',
        'forex',
        'futures',
        'crypto',
        'options'
    ) NOT NULL,
    instrument VARCHAR(50) NOT NULL,
    trade_type ENUM('long', 'short') NOT NULL,
    strategy VARCHAR(100) NULL,
    setup_type VARCHAR(100) NULL,
    market_condition VARCHAR(100) NULL,
    entry_date DATE NOT NULL,
    entry_time TIME NULL,
    entry_price DECIMAL(15, 8) NOT NULL,
    quantity DECIMAL(15, 8) NOT NULL,
    exit_date DATE NULL,
    exit_time TIME NULL,
    exit_price DECIMAL(15, 8) NULL,
    stop_loss DECIMAL(15, 8) NULL,
    take_profit DECIMAL(15, 8) NULL,
    fees DECIMAL(10, 2) DEFAULT 0.00,
    pnl DECIMAL(15, 2) NULL,
    status ENUM('open', 'closed', 'cancelled') DEFAULT 'open',
    notes TEXT NULL,
    risk_reward_ratio DECIMAL(5, 2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_instrument (instrument),
    INDEX idx_trade_type (trade_type),
    INDEX idx_status (status),
    INDEX idx_entry_date (entry_date),
    INDEX idx_strategy (strategy),
    INDEX idx_pnl (pnl),
    INDEX idx_created_at (created_at)
);
-- Trade tags (many-to-many relationship)
CREATE TABLE trade_tags (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trade_id BIGINT UNSIGNED NOT NULL,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE,
    INDEX idx_trade_id (trade_id),
    INDEX idx_tag (tag),
    UNIQUE KEY unique_trade_tag (trade_id, tag)
);
-- User custom strategies
CREATE TABLE user_strategies (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    UNIQUE KEY unique_user_strategy (user_id, name)
);
-- User custom setups
CREATE TABLE user_setups (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    UNIQUE KEY unique_user_setup (user_id, name)
);
-- User custom market conditions
CREATE TABLE user_market_conditions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    UNIQUE KEY unique_user_market_condition (user_id, name)
);
-- ========================================
-- Template System
-- ========================================
CREATE TABLE trade_templates (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    template_data JSON NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    INDEX idx_is_default (is_default),
    UNIQUE KEY unique_user_template (user_id, name)
);
-- ========================================
-- Billing and Subscriptions
-- ========================================
CREATE TABLE subscription_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle ENUM('monthly', 'yearly') NOT NULL,
    features JSON NULL,
    max_trades INT NULL,
    max_templates INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_is_active (is_active)
);
CREATE TABLE user_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active', 'cancelled', 'expired', 'trial') DEFAULT 'active',
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    auto_renew BOOLEAN DEFAULT TRUE,
    stripe_subscription_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    INDEX idx_user_id (user_id),
    INDEX idx_plan_id (plan_id),
    INDEX idx_status (status),
    INDEX idx_ends_at (ends_at)
);
-- ========================================
-- Analytics and Reporting
-- ========================================
CREATE TABLE user_analytics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    metric_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_metric_name (metric_name),
    INDEX idx_metric_date (metric_date),
    UNIQUE KEY unique_user_metric_date (user_id, metric_name, metric_date)
);
-- ========================================
-- Audit and Logging
-- ========================================
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE
    SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_table_name (table_name),
        INDEX idx_created_at (created_at)
);
-- ========================================
-- Email Verification System
-- ========================================
CREATE TABLE email_verification_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type ENUM(
        'email_verification',
        'password_reset',
        'email_change'
    ) DEFAULT 'email_verification',
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),
    INDEX idx_token_type (token_type)
);
-- ========================================
-- Credit Card and Payment Management
-- ========================================
CREATE TABLE user_payment_methods (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
    card_brand VARCHAR(50) NULL,
    card_last_four VARCHAR(4) NULL,
    card_exp_month INT NULL,
    card_exp_year INT NULL,
    billing_name VARCHAR(255) NULL,
    billing_email VARCHAR(255) NULL,
    billing_address JSON NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_amount_cents INT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_stripe_payment_method_id (stripe_payment_method_id),
    INDEX idx_is_default (is_default),
    INDEX idx_is_verified (is_verified)
);
CREATE TABLE payment_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    payment_method_id BIGINT UNSIGNED NULL,
    stripe_payment_intent_id VARCHAR(255) UNIQUE NULL,
    transaction_type ENUM(
        'subscription',
        'verification',
        'refund',
        'chargeback'
    ) NOT NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM(
        'pending',
        'succeeded',
        'failed',
        'cancelled',
        'refunded'
    ) DEFAULT 'pending',
    description TEXT NULL,
    metadata JSON NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_id) REFERENCES user_payment_methods(id) ON DELETE
    SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_stripe_payment_intent_id (stripe_payment_intent_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
);
-- ========================================
-- Invoicing System
-- ========================================
CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    subscription_id BIGINT UNSIGNED NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    stripe_invoice_id VARCHAR(255) UNIQUE NULL,
    amount_cents INT NOT NULL,
    tax_amount_cents INT DEFAULT 0,
    discount_amount_cents INT DEFAULT 0,
    total_amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('draft', 'open', 'paid', 'void', 'uncollectible') DEFAULT 'draft',
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMP NULL,
    invoice_pdf_url VARCHAR(500) NULL,
    billing_details JSON NULL,
    line_items JSON NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE
    SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_subscription_id (subscription_id),
        INDEX idx_invoice_number (invoice_number),
        INDEX idx_status (status),
        INDEX idx_billing_period (billing_period_start, billing_period_end),
        INDEX idx_due_date (due_date),
        INDEX idx_paid_at (paid_at),
        INDEX idx_created_at (created_at)
);
-- ========================================
-- Revenue Tracking System
-- ========================================
CREATE TABLE revenue_analytics (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    period_type ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_revenue_cents INT DEFAULT 0,
    subscription_revenue_cents INT DEFAULT 0,
    trial_conversions INT DEFAULT 0,
    new_subscriptions INT DEFAULT 0,
    cancelled_subscriptions INT DEFAULT 0,
    active_subscriptions INT DEFAULT 0,
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    churn_rate DECIMAL(5, 2) DEFAULT 0.00,
    mrr_cents INT DEFAULT 0,
    -- Monthly Recurring Revenue
    arr_cents INT DEFAULT 0,
    -- Annual Recurring Revenue
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_period (period_type, period_start, period_end),
    INDEX idx_period_type (period_type),
    INDEX idx_period_start (period_start),
    INDEX idx_period_end (period_end)
);
-- ========================================
-- Trial Management System
-- NOTE: For development, trial system is disabled
-- These tables are ready for production use
-- ========================================
CREATE TABLE user_trials (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    trial_type ENUM('initial_signup', 'promotional', 'extended') DEFAULT 'initial_signup',
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    status ENUM('active', 'expired', 'converted', 'cancelled') DEFAULT 'active',
    plan_id BIGINT UNSIGNED NULL,
    conversion_date TIMESTAMP NULL,
    cancellation_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE
    SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_trial_type (trial_type),
        INDEX idx_status (status),
        INDEX idx_ends_at (ends_at),
        UNIQUE KEY unique_user_trial_type (user_id, trial_type)
);
-- User account requirements tracking
CREATE TABLE user_account_requirements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP NULL,
    payment_method_added BOOLEAN DEFAULT FALSE,
    payment_method_verified BOOLEAN DEFAULT FALSE,
    payment_verified_at TIMESTAMP NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    profile_completed_at TIMESTAMP NULL,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP NULL,
    privacy_accepted BOOLEAN DEFAULT FALSE,
    privacy_accepted_at TIMESTAMP NULL,
    can_access_platform BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_requirements (user_id),
    INDEX idx_email_verified (email_verified),
    INDEX idx_payment_method_verified (payment_method_verified),
    INDEX idx_can_access_platform (can_access_platform)
);
-- Admin revenue dashboard views
CREATE TABLE admin_revenue_filters (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    filter_name VARCHAR(100) NOT NULL,
    filter_criteria JSON NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_user_id (admin_user_id),
    INDEX idx_filter_name (filter_name),
    UNIQUE KEY unique_admin_filter (admin_user_id, filter_name)
);
-- ========================================
-- Performance Optimization
-- ========================================
-- Partitioning for large tables (example for trades table)
-- This would be implemented based on date ranges
-- ALTER TABLE trades PARTITION BY RANGE (YEAR(entry_date)) (
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION p2026 VALUES LESS THAN (2027),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );
-- ========================================
-- Initial Data
-- ========================================
-- Default subscription plans
INSERT INTO subscription_plans (
        name,
        description,
        price,
        billing_cycle,
        features,
        max_trades,
        max_templates
    )
VALUES (
        'Trial',
        '7-day free trial with full access',
        0.00,
        'monthly',
        '["All Pro features", "7-day trial period", "Full access to platform"]',
        NULL,
        NULL
    ),
    (
        'Free',
        'Basic trade journal features',
        0.00,
        'monthly',
        '["Basic trade tracking", "Limited analytics"]',
        100,
        5
    ),
    (
        'Pro',
        'Advanced features for serious traders',
        29.99,
        'monthly',
        '["Unlimited trades", "Advanced analytics", "Custom templates", "Export features"]',
        NULL,
        NULL
    ),
    (
        'Enterprise',
        'Full-featured plan for professional traders',
        99.99,
        'monthly',
        '["All Pro features", "Priority support", "Advanced reporting", "API access"]',
        NULL,
        NULL
    );
-- ========================================
-- Database Maintenance Procedures
-- ========================================
DELIMITER // -- Clean up expired sessions
CREATE PROCEDURE CleanupExpiredSessions() BEGIN
DELETE FROM user_sessions
WHERE expires_at < NOW()
    AND is_active = FALSE;
END // -- Calculate user analytics
CREATE PROCEDURE CalculateUserAnalytics(IN user_id BIGINT) BEGIN -- Calculate total P&L
INSERT INTO user_analytics (user_id, metric_name, metric_value, metric_date)
VALUES (
        user_id,
        'total_pnl',
        (
            SELECT COALESCE(SUM(pnl), 0)
            FROM trades
            WHERE user_id = user_id
                AND status = 'closed'
        ),
        CURDATE()
    ) ON DUPLICATE KEY
UPDATE metric_value =
VALUES(metric_value);
-- Calculate win rate
INSERT INTO user_analytics (user_id, metric_name, metric_value, metric_date)
VALUES (
        user_id,
        'win_rate',
        (
            SELECT COALESCE(
                    (
                        COUNT(
                            CASE
                                WHEN pnl > 0 THEN 1
                            END
                        ) / COUNT(*)
                    ) * 100,
                    0
                )
            FROM trades
            WHERE user_id = user_id
                AND status = 'closed'
        ),
        CURDATE()
    ) ON DUPLICATE KEY
UPDATE metric_value =
VALUES(metric_value);
END // DELIMITER;
-- ========================================
-- Database Configuration for Scale
-- ========================================
-- Optimize for performance
SET GLOBAL innodb_buffer_pool_size = 1073741824;
-- 1GB
SET GLOBAL query_cache_size = 268435456;
-- 256MB
SET GLOBAL max_connections = 1000;
SET GLOBAL innodb_log_file_size = 268435456;
-- 256MB
-- Enable slow query log for optimization
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
-- ========================================
-- Backup and Recovery
-- ========================================
-- Example backup command (run from command line)
-- mysqldump -u root -p trade_journal > backup_$(date +%Y%m%d_%H%M%S).sql
-- Example restore command
-- mysql -u root -p trade_journal < backup_file.sql
-- ========================================
-- Stored Procedures
-- ========================================
DELIMITER // -- Create 7-day trial for new user
CREATE PROCEDURE CreateUserTrial(IN user_id BIGINT) BEGIN
DECLARE trial_plan_id BIGINT;
DECLARE trial_start TIMESTAMP DEFAULT NOW();
DECLARE trial_end TIMESTAMP DEFAULT DATE_ADD(NOW(), INTERVAL 7 DAY);
-- Get trial plan ID
SELECT id INTO trial_plan_id
FROM subscription_plans
WHERE name = 'Trial'
LIMIT 1;
-- Create trial record
INSERT INTO user_trials (
        user_id,
        trial_type,
        starts_at,
        ends_at,
        status,
        plan_id
    )
VALUES (
        user_id,
        'initial_signup',
        trial_start,
        trial_end,
        'active',
        trial_plan_id
    );
-- Create subscription record
INSERT INTO user_subscriptions (
        user_id,
        plan_id,
        status,
        starts_at,
        ends_at,
        auto_renew
    )
VALUES (
        user_id,
        trial_plan_id,
        'trial',
        trial_start,
        trial_end,
        FALSE
    );
-- Initialize account requirements
INSERT INTO user_account_requirements (user_id)
VALUES (user_id);
END // -- Check if user can access platform
CREATE PROCEDURE CheckUserAccess(IN user_id BIGINT, OUT can_access BOOLEAN) BEGIN
DECLARE email_verified BOOLEAN DEFAULT FALSE;
DECLARE payment_verified BOOLEAN DEFAULT FALSE;
DECLARE trial_active BOOLEAN DEFAULT FALSE;
DECLARE subscription_active BOOLEAN DEFAULT FALSE;
-- Check email verification
SELECT email_verified INTO email_verified
FROM user_account_requirements
WHERE user_id = user_id;
-- Check payment verification
SELECT payment_verified INTO payment_verified
FROM user_account_requirements
WHERE user_id = user_id;
-- Check active trial
SELECT COUNT(*) > 0 INTO trial_active
FROM user_trials
WHERE user_id = user_id
    AND status = 'active'
    AND ends_at > NOW();
-- Check active subscription
SELECT COUNT(*) > 0 INTO subscription_active
FROM user_subscriptions
WHERE user_id = user_id
    AND status IN ('active', 'trial')
    AND ends_at > NOW();
-- User can access if email verified, payment verified, and has active trial/subscription
SET can_access = (
        email_verified
        AND payment_verified
        AND (
            trial_active
            OR subscription_active
        )
    );
-- Update account requirements
UPDATE user_account_requirements
SET can_access_platform = can_access
WHERE user_id = user_id;
END // -- Expire trials and handle transitions
CREATE PROCEDURE ProcessExpiredTrials() BEGIN
DECLARE done INT DEFAULT FALSE;
DECLARE user_id BIGINT;
DECLARE trial_cursor CURSOR FOR
SELECT ut.user_id
FROM user_trials ut
WHERE ut.status = 'active'
    AND ut.ends_at <= NOW();
DECLARE CONTINUE HANDLER FOR NOT FOUND
SET done = TRUE;
OPEN trial_cursor;
trial_loop: LOOP FETCH trial_cursor INTO user_id;
IF done THEN LEAVE trial_loop;
END IF;
-- Update trial status
UPDATE user_trials
SET status = 'expired'
WHERE user_id = user_id
    AND status = 'active';
-- Update subscription status
UPDATE user_subscriptions
SET status = 'expired'
WHERE user_id = user_id
    AND status = 'trial';
-- Update user access
UPDATE user_account_requirements
SET can_access_platform = FALSE
WHERE user_id = user_id;
-- Log the expiration
INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_values
    )
VALUES (
        user_id,
        'trial_expired',
        'user_trials',
        user_id,
        '{"status": "expired"}'
    );
END LOOP;
CLOSE trial_cursor;
END // -- Generate email verification token
CREATE PROCEDURE GenerateEmailVerificationToken(IN user_id BIGINT, OUT token VARCHAR(255)) BEGIN
SET token = CONCAT(
        SUBSTRING(MD5(RAND()), 1, 8),
        '-',
        SUBSTRING(MD5(RAND()), 1, 4),
        '-',
        SUBSTRING(MD5(RAND()), 1, 4),
        '-',
        SUBSTRING(MD5(RAND()), 1, 4),
        '-',
        SUBSTRING(MD5(RAND()), 1, 12)
    );
-- Delete any existing verification tokens
DELETE FROM email_verification_tokens
WHERE user_id = user_id
    AND token_type = 'email_verification';
-- Insert new token
INSERT INTO email_verification_tokens (user_id, token, token_type, expires_at)
VALUES (
        user_id,
        token,
        'email_verification',
        DATE_ADD(NOW(), INTERVAL 24 HOUR)
    );
END // -- Verify email token
CREATE PROCEDURE VerifyEmailToken(
    IN token VARCHAR(255),
    OUT is_valid BOOLEAN,
    OUT user_id BIGINT
) BEGIN
DECLARE token_user_id BIGINT DEFAULT NULL;
DECLARE token_expires TIMESTAMP DEFAULT NULL;
DECLARE token_used TIMESTAMP DEFAULT NULL;
-- Get token details
SELECT evt.user_id,
    evt.expires_at,
    evt.used_at INTO token_user_id,
    token_expires,
    token_used
FROM email_verification_tokens evt
WHERE evt.token = token
    AND evt.token_type = 'email_verification';
-- Check if token is valid
IF token_user_id IS NOT NULL
AND token_expires > NOW()
AND token_used IS NULL THEN
SET is_valid = TRUE;
SET user_id = token_user_id;
-- Mark token as used
UPDATE email_verification_tokens
SET used_at = NOW()
WHERE token = token
    AND token_type = 'email_verification';
-- Update user email verification status
UPDATE users
SET email_verified = TRUE,
    email_verified_at = NOW()
WHERE id = token_user_id;
-- Update account requirements
UPDATE user_account_requirements
SET email_verified = TRUE,
    email_verified_at = NOW()
WHERE user_id = token_user_id;
ELSE
SET is_valid = FALSE;
SET user_id = NULL;
END IF;
END // DELIMITER;
-- Admin revenue and user management procedures
DELIMITER // CREATE PROCEDURE GetAdminUserList(
    IN admin_user_id BIGINT,
    IN search_term VARCHAR(255),
    IN status_filter VARCHAR(50),
    IN subscription_filter VARCHAR(50),
    IN limit_count INT,
    IN offset_count INT
) BEGIN
DECLARE sql_query TEXT;
-- Build dynamic query based on filters
SET sql_query = CONCAT(
        '
        SELECT 
            u.id,
            u.email,
            u.username,
            u.role,
            u.status,
            u.email_verified,
            u.created_at,
            u.last_login_at,
            CONCAT(up.first_name, " ", up.last_name) as full_name,
            sp.name as subscription_plan,
            us.status as subscription_status,
            us.starts_at as subscription_start,
            us.ends_at as subscription_end,
            us.auto_renew,
            (SELECT COUNT(*) FROM trades t WHERE t.user_id = u.id) as trade_count,
            (SELECT SUM(total_amount_cents) FROM invoices i WHERE i.user_id = u.id AND i.status = "paid") as total_revenue_cents
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status IN ("active", "trial")
        LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE u.role != "admin"
    '
    );
-- Add search filter
IF search_term IS NOT NULL
AND search_term != '' THEN
SET sql_query = CONCAT(
        sql_query,
        ' AND (u.email LIKE "%',
        search_term,
        '%" OR u.username LIKE "%',
        search_term,
        '%" OR CONCAT(up.first_name, " ", up.last_name) LIKE "%',
        search_term,
        '%")'
    );
END IF;
-- Add status filter
IF status_filter IS NOT NULL
AND status_filter != ''
AND status_filter != 'all' THEN
SET sql_query = CONCAT(
        sql_query,
        ' AND u.status = "',
        status_filter,
        '"'
    );
END IF;
-- Add subscription filter
IF subscription_filter IS NOT NULL
AND subscription_filter != ''
AND subscription_filter != 'all' THEN IF subscription_filter = 'active' THEN
SET sql_query = CONCAT(sql_query, ' AND us.status = "active"');
ELSEIF subscription_filter = 'trial' THEN
SET sql_query = CONCAT(sql_query, ' AND us.status = "trial"');
ELSEIF subscription_filter = 'expired' THEN
SET sql_query = CONCAT(
        sql_query,
        ' AND (us.status = "expired" OR us.status IS NULL)'
    );
END IF;
END IF;
-- Add ordering and pagination
SET sql_query = CONCAT(
        sql_query,
        ' ORDER BY u.created_at DESC LIMIT ',
        limit_count,
        ' OFFSET ',
        offset_count
    );
-- Execute the query
SET @sql = sql_query;
PREPARE stmt
FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
END // -- Get user invoices with filtering
CREATE PROCEDURE GetUserInvoices(
    IN user_id_param BIGINT,
    IN start_date DATE,
    IN end_date DATE,
    IN status_filter VARCHAR(50),
    IN limit_count INT,
    IN offset_count INT
) BEGIN
SELECT i.id,
    i.invoice_number,
    i.amount_cents,
    i.tax_amount_cents,
    i.discount_amount_cents,
    i.total_amount_cents,
    i.currency,
    i.status,
    i.billing_period_start,
    i.billing_period_end,
    i.due_date,
    i.paid_at,
    i.invoice_pdf_url,
    i.billing_details,
    i.line_items,
    i.created_at,
    u.email as user_email,
    CONCAT(up.first_name, " ", up.last_name) as user_full_name,
    sp.name as plan_name
FROM invoices i
    JOIN users u ON i.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_subscriptions us ON i.subscription_id = us.id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE (
        user_id_param IS NULL
        OR i.user_id = user_id_param
    )
    AND (
        start_date IS NULL
        OR i.billing_period_start >= start_date
    )
    AND (
        end_date IS NULL
        OR i.billing_period_end <= end_date
    )
    AND (
        status_filter IS NULL
        OR status_filter = 'all'
        OR i.status = status_filter
    )
ORDER BY i.created_at DESC
LIMIT limit_count OFFSET offset_count;
END // -- Calculate revenue for specific period
CREATE PROCEDURE CalculateRevenueAnalytics(
    IN period_type_param VARCHAR(10),
    IN start_date DATE,
    IN end_date DATE
) BEGIN
DECLARE total_revenue_cents INT DEFAULT 0;
DECLARE subscription_revenue_cents INT DEFAULT 0;
DECLARE trial_conversions INT DEFAULT 0;
DECLARE new_subscriptions INT DEFAULT 0;
DECLARE cancelled_subscriptions INT DEFAULT 0;
DECLARE active_subscriptions INT DEFAULT 0;
DECLARE total_users INT DEFAULT 0;
DECLARE active_users INT DEFAULT 0;
DECLARE churn_rate DECIMAL(5, 2) DEFAULT 0.00;
DECLARE mrr_cents INT DEFAULT 0;
DECLARE arr_cents INT DEFAULT 0;
-- Calculate total revenue from paid invoices
SELECT COALESCE(SUM(total_amount_cents), 0) INTO total_revenue_cents
FROM invoices
WHERE status = 'paid'
    AND paid_at >= start_date
    AND paid_at <= end_date;
-- Calculate subscription revenue (excluding one-time charges)
SELECT COALESCE(SUM(i.total_amount_cents), 0) INTO subscription_revenue_cents
FROM invoices i
    JOIN user_subscriptions us ON i.subscription_id = us.id
WHERE i.status = 'paid'
    AND i.paid_at >= start_date
    AND i.paid_at <= end_date;
-- Calculate trial conversions
SELECT COUNT(*) INTO trial_conversions
FROM user_trials ut
WHERE ut.status = 'converted'
    AND ut.conversion_date >= start_date
    AND ut.conversion_date <= end_date;
-- Calculate new subscriptions
SELECT COUNT(*) INTO new_subscriptions
FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
    AND sp.name != 'Trial'
    AND us.starts_at >= start_date
    AND us.starts_at <= end_date;
-- Calculate cancelled subscriptions
SELECT COUNT(*) INTO cancelled_subscriptions
FROM user_subscriptions us
WHERE us.status = 'cancelled'
    AND us.updated_at >= start_date
    AND us.updated_at <= end_date;
-- Calculate active subscriptions
SELECT COUNT(*) INTO active_subscriptions
FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
    AND sp.name != 'Trial'
    AND us.ends_at > NOW();
-- Calculate total users
SELECT COUNT(*) INTO total_users
FROM users
WHERE created_at >= start_date
    AND created_at <= end_date;
-- Calculate active users (logged in during period)
SELECT COUNT(DISTINCT user_id) INTO active_users
FROM user_sessions
WHERE last_accessed_at >= start_date
    AND last_accessed_at <= end_date;
-- Calculate churn rate
IF (active_subscriptions + cancelled_subscriptions) > 0 THEN
SET churn_rate = (
        cancelled_subscriptions / (active_subscriptions + cancelled_subscriptions)
    ) * 100;
END IF;
-- Calculate MRR (Monthly Recurring Revenue)
SELECT COALESCE(
        SUM(
            CASE
                WHEN sp.billing_cycle = 'monthly' THEN sp.price * 100
                WHEN sp.billing_cycle = 'yearly' THEN (sp.price * 100) / 12
                ELSE 0
            END
        ),
        0
    ) INTO mrr_cents
FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
    AND sp.name != 'Trial'
    AND us.ends_at > NOW();
-- Calculate ARR (Annual Recurring Revenue)
SET arr_cents = mrr_cents * 12;
-- Insert or update revenue analytics
INSERT INTO revenue_analytics (
        period_type,
        period_start,
        period_end,
        total_revenue_cents,
        subscription_revenue_cents,
        trial_conversions,
        new_subscriptions,
        cancelled_subscriptions,
        active_subscriptions,
        total_users,
        active_users,
        churn_rate,
        mrr_cents,
        arr_cents
    )
VALUES (
        period_type_param,
        start_date,
        end_date,
        total_revenue_cents,
        subscription_revenue_cents,
        trial_conversions,
        new_subscriptions,
        cancelled_subscriptions,
        active_subscriptions,
        total_users,
        active_users,
        churn_rate,
        mrr_cents,
        arr_cents
    ) ON DUPLICATE KEY
UPDATE total_revenue_cents =
VALUES(total_revenue_cents),
    subscription_revenue_cents =
VALUES(subscription_revenue_cents),
    trial_conversions =
VALUES(trial_conversions),
    new_subscriptions =
VALUES(new_subscriptions),
    cancelled_subscriptions =
VALUES(cancelled_subscriptions),
    active_subscriptions =
VALUES(active_subscriptions),
    total_users =
VALUES(total_users),
    active_users =
VALUES(active_users),
    churn_rate =
VALUES(churn_rate),
    mrr_cents =
VALUES(mrr_cents),
    arr_cents =
VALUES(arr_cents),
    updated_at = NOW();
-- Return the calculated analytics
SELECT *
FROM revenue_analytics
WHERE period_type = period_type_param
    AND period_start = start_date
    AND period_end = end_date;
END // -- Remove admin users from subscription requirements
CREATE PROCEDURE RemoveAdminSubscriptions() BEGIN -- Cancel all admin subscriptions
UPDATE user_subscriptions us
    JOIN users u ON us.user_id = u.id
SET us.status = 'cancelled',
    us.auto_renew = FALSE
WHERE u.role = 'admin';
-- Remove admin users from trials
UPDATE user_trials ut
    JOIN users u ON ut.user_id = u.id
SET ut.status = 'cancelled'
WHERE u.role = 'admin';
-- Update admin access requirements
UPDATE user_account_requirements uar
    JOIN users u ON uar.user_id = u.id
SET uar.can_access_platform = TRUE,
    uar.onboarding_completed = TRUE,
    uar.onboarding_completed_at = NOW()
WHERE u.role = 'admin';
END // -- Get current month revenue
CREATE PROCEDURE GetCurrentMonthRevenue() BEGIN
DECLARE current_month_start DATE;
DECLARE current_month_end DATE;
SET current_month_start = DATE_FORMAT(NOW(), '%Y-%m-01');
SET current_month_end = LAST_DAY(NOW());
CALL CalculateRevenueAnalytics(
    'monthly',
    current_month_start,
    current_month_end
);
END // -- Get current year revenue
CREATE PROCEDURE GetCurrentYearRevenue() BEGIN
DECLARE current_year_start DATE;
DECLARE current_year_end DATE;
SET current_year_start = DATE_FORMAT(NOW(), '%Y-01-01');
SET current_year_end = DATE_FORMAT(NOW(), '%Y-12-31');
CALL CalculateRevenueAnalytics('yearly', current_year_start, current_year_end);
END // DELIMITER;