# Trade Journal Pro - Backend Setup Guide

## Database Setup

### 1. MySQL Installation and Configuration

1. Install MySQL 8.0+ on your server
2. Create the database using the schema:

```bash
mysql -u root -p < database/schema_v2.sql
```

### 2. Database Configuration

The database schema is designed for scalability with:

- **Partitioned tables** for trade data (by year)
- **Optimized indexes** for fast queries
- **JSON fields** for flexible data storage
- **Views** for common queries
- **Triggers** for automatic performance calculations
- **Stored procedures** for complex analytics

### 3. Environment Variables

Create a `.env` file in your backend directory:

```env
# Database
DB_HOST=localhost
DB_USER=tradejournalpro_app
DB_PASSWORD=your_secure_password
DB_NAME=trade_journal_pro

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production

# File Upload
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Backend API Setup

### 1. Install Dependencies

```bash
npm init -y
npm install express mysql2 bcryptjs jsonwebtoken cors helmet express-rate-limit
npm install --save-dev nodemon
```

### 2. Package.json Scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest"
  }
}
```

### 3. Server Structure

```
backend/
├── server.js              # Main server file
├── config/
│   ├── database.js        # Database configuration
│   └── auth.js           # Authentication config
├── controllers/
│   ├── authController.js  # Authentication logic
│   ├── userController.js  # User management
│   ├── tradeController.js # Trade operations
│   └── analyticsController.js # Analytics
├── middleware/
│   ├── auth.js           # JWT authentication
│   ├── validation.js     # Input validation
│   └── rateLimit.js      # Rate limiting
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── user.js           # User routes
│   ├── trades.js         # Trade routes
│   └── analytics.js      # Analytics routes
├── models/
│   ├── User.js           # User model
│   ├── Trade.js          # Trade model
│   └── Template.js       # Template model
└── utils/
    ├── encryption.js     # Data encryption
    ├── validation.js     # Input validation
    └── helpers.js        # Helper functions
```

## Frontend Integration

### 1. API Client Setup

Update your frontend to use the backend API:

```javascript
// src/services/api.js
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const apiClient = {
  get: async (endpoint, token) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  post: async (endpoint, data, token) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  put: async (endpoint, data, token) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

export default apiClient;
```

### 2. Update AuthContext

```javascript
// In src/context/AuthContext.jsx
import apiClient from "../services/api";

// Update the updateUserProfile function:
const updateUserProfile = async (profileData) => {
  try {
    const token = Cookies.get("auth_token");
    const response = await apiClient.put("/user/profile", profileData, token);

    if (response.success) {
      // Update local state
      const updatedUser = { ...state.user, ...profileData };
      dispatch({ type: ActionTypes.SET_USER, payload: updatedUser });
      return updatedUser;
    } else {
      throw new Error(response.error || "Failed to update profile");
    }
  } catch (error) {
    throw error;
  }
};
```

## Deployment Considerations

### 1. Database Optimization for 100k+ Users

1. **Sharding**: Partition users across multiple database instances
2. **Read Replicas**: Use read replicas for analytics queries
3. **Caching**: Implement Redis for session management and frequently accessed data
4. **Connection Pooling**: Use connection pooling for database connections

### 2. Security Best Practices

1. **SQL Injection Prevention**: Use parameterized queries
2. **Input Validation**: Validate all user inputs
3. **Rate Limiting**: Implement rate limiting on all endpoints
4. **HTTPS**: Use HTTPS in production
5. **Data Encryption**: Encrypt sensitive data at rest

### 3. Performance Optimization

1. **Indexing**: Regularly monitor and optimize database indexes
2. **Query Optimization**: Use EXPLAIN to optimize slow queries
3. **CDN**: Use CDN for static assets
4. **Compression**: Enable gzip compression
5. **Monitoring**: Implement application monitoring (New Relic, Datadog)

### 4. Backup and Recovery

1. **Database Backups**: Daily automated backups
2. **Point-in-time Recovery**: Enable binary logging
3. **Disaster Recovery**: Multi-region deployment
4. **Data Archiving**: Archive old data to reduce database size

## API Endpoints Summary

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

### Profile Management

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/profile/picture` - Upload profile picture
- `DELETE /api/user/profile/picture` - Delete profile picture
- `DELETE /api/user/account` - Delete user account

### User Management

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `DELETE /api/user/account` - Delete user account

### Trades

- `GET /api/user/trades` - Get user trades
- `POST /api/user/trades` - Create new trade
- `PUT /api/user/trades/:id` - Update trade
- `DELETE /api/user/trades/:id` - Delete trade

### Templates

- `GET /api/user/templates` - Get user templates
- `POST /api/user/templates` - Create template
- `PUT /api/user/templates/:id` - Update template
- `DELETE /api/user/templates/:id` - Delete template

### Analytics

- `GET /api/user/performance` - Get performance metrics
- `GET /api/user/analytics/monthly` - Monthly analytics
- `GET /api/user/analytics/instruments` - Instrument performance

### Admin (Admin Only)

- `GET /api/admin/users` - Get all users
- `GET /api/admin/analytics` - System analytics
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Testing

### 1. Unit Tests

```bash
npm install --save-dev jest supertest
npm test
```

### 2. Integration Tests

Test all API endpoints with sample data

### 3. Load Testing

Use tools like Apache JMeter or Artillery to test with 100k+ users

This setup provides a solid foundation for a scalable trade journal application that can handle 100,000+ users with proper database optimization and caching strategies.
