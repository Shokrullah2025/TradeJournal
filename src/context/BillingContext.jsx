import React, { createContext, useContext, useState, useEffect } from 'react';

// Security utilities for data protection
const encryptSensitiveData = (data) => {
  // In a real app, use proper encryption
  // For demo purposes, we'll simulate encryption
  return btoa(JSON.stringify(data));
};

const decryptSensitiveData = (encryptedData) => {
  // In a real app, use proper decryption
  try {
    return JSON.parse(atob(encryptedData));
  } catch {
    return null;
  }
};

const sanitizePaymentData = (payment) => {
  // Remove or mask sensitive information for logging/storage
  return {
    ...payment,
    cardNumber: undefined, // Never store full card numbers
    cvv: undefined, // Never store CVV
    cardLast4: payment.cardLast4 || payment.cardNumber?.slice(-4),
  };
};

const validatePaymentData = (data) => {
  const errors = [];
  
  if (!data.userId) errors.push('User ID is required');
  if (!data.amount || data.amount <= 0) errors.push('Valid amount is required');
  if (!data.plan || !['basic', 'premium', 'enterprise'].includes(data.plan)) {
    errors.push('Valid plan is required');
  }
  if (!data.billingCycle || !['monthly', 'yearly'].includes(data.billingCycle)) {
    errors.push('Valid billing cycle is required');
  }
  
  return errors;
};

const BillingContext = createContext();

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
};

export const BillingProvider = ({ children }) => {
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // Mock payment data - in a real app, this would come from your payment processor
  useEffect(() => {
    const mockPayments = [
      {
        id: 'pay_001',
        userId: 'user1',
        userEmail: 'admin@example.com',
        userName: 'Admin User',
        amount: 29.00,
        currency: 'USD',
        plan: 'premium',
        billingCycle: 'monthly',
        status: 'completed',
        paymentMethod: 'card',
        cardLast4: '4242',
        cardBrand: 'visa',
        createdAt: new Date('2024-12-01'),
        nextBillingDate: new Date('2025-01-01'),
      },
      {
        id: 'pay_002',
        userId: 'user2',
        userEmail: 'john@example.com',
        userName: 'John Doe',
        amount: 290.00,
        currency: 'USD',
        plan: 'premium',
        billingCycle: 'yearly',
        status: 'completed',
        paymentMethod: 'card',
        cardLast4: '1234',
        cardBrand: 'mastercard',
        createdAt: new Date('2024-11-15'),
        nextBillingDate: new Date('2025-11-15'),
      },
      {
        id: 'pay_003',
        userId: 'user3',
        userEmail: 'jane@example.com',
        userName: 'Jane Smith',
        amount: 99.00,
        currency: 'USD',
        plan: 'enterprise',
        billingCycle: 'monthly',
        status: 'completed',
        paymentMethod: 'card',
        cardLast4: '5678',
        cardBrand: 'amex',
        createdAt: new Date('2024-12-10'),
        nextBillingDate: new Date('2025-01-10'),
      },
      {
        id: 'pay_004',
        userId: 'user4',
        userEmail: 'bob@example.com',
        userName: 'Bob Wilson',
        amount: 29.00,
        currency: 'USD',
        plan: 'premium',
        billingCycle: 'monthly',
        status: 'failed',
        paymentMethod: 'card',
        cardLast4: '9999',
        cardBrand: 'visa',
        createdAt: new Date('2024-12-15'),
        nextBillingDate: new Date('2025-01-15'),
        failureReason: 'Insufficient funds',
      },
    ];

    setPayments(mockPayments);

    // Calculate subscription stats
    const stats = {
      totalSubscribers: mockPayments.filter(p => p.status === 'completed').length,
      totalRevenue: mockPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0),
      monthlyRevenue: mockPayments
        .filter(p => p.status === 'completed' && p.billingCycle === 'monthly')
        .reduce((sum, payment) => sum + payment.amount, 0),
      yearlyRevenue: mockPayments
        .filter(p => p.status === 'completed' && p.billingCycle === 'yearly')
        .reduce((sum, payment) => sum + payment.amount, 0),
      subscriptionsByPlan: {
        basic: 0,
        premium: mockPayments.filter(p => p.plan === 'premium' && p.status === 'completed').length,
        enterprise: mockPayments.filter(p => p.plan === 'enterprise' && p.status === 'completed').length,
      },
      failedPayments: mockPayments.filter(p => p.status === 'failed').length,
    };

    setSubscriptions(stats);
  }, []);

  const processPayment = async (paymentData) => {
    // Validate payment data
    const validationErrors = validatePaymentData(paymentData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Sanitize payment data before processing
    const sanitizedData = sanitizePaymentData(paymentData);

    // Simulate payment processing with security measures
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 90% success rate for demo
        if (Math.random() > 0.1) {
          const newPayment = {
            id: `pay_${Date.now()}`,
            ...sanitizedData,
            status: 'completed',
            createdAt: new Date(),
            nextBillingDate: new Date(Date.now() + (paymentData.billingCycle === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
            // Store encrypted sensitive data if needed
            encryptedData: encryptSensitiveData({
              originalAmount: paymentData.amount,
              processingFee: paymentData.amount * 0.029, // 2.9% processing fee
            }),
          };

          setPayments(prev => [newPayment, ...prev]);
          
          // Update subscription stats securely
          setSubscriptions(prev => ({
            ...prev,
            totalSubscribers: prev.totalSubscribers + 1,
            totalRevenue: prev.totalRevenue + paymentData.amount,
            subscriptionsByPlan: {
              ...prev.subscriptionsByPlan,
              [paymentData.plan]: prev.subscriptionsByPlan[paymentData.plan] + 1,
            },
          }));

          // Log successful payment (without sensitive data)
          console.log('Payment processed successfully:', {
            id: newPayment.id,
            amount: newPayment.amount,
            plan: newPayment.plan,
            userId: newPayment.userId,
          });

          resolve(newPayment);
        } else {
          // Log failed payment attempt
          console.warn('Payment failed for user:', paymentData.userId);
          reject(new Error('Payment processing failed'));
        }
      }, 2000);
    });
  };

  const getPaymentsByUser = (userId) => {
    return payments.filter(payment => payment.userId === userId);
  };

  const getSubscriptionAnalytics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentPayments = payments.filter(p => p.createdAt >= thirtyDaysAgo);
    
    return {
      ...subscriptions,
      recentPayments: recentPayments.length,
      averageRevenuePerUser: subscriptions.totalSubscribers > 0 
        ? subscriptions.totalRevenue / subscriptions.totalSubscribers 
        : 0,
      churnRate: 0.05, // Mock 5% churn rate
      growthRate: 0.15, // Mock 15% growth rate
    };
  };

  const value = {
    payments,
    subscriptions,
    processPayment,
    getPaymentsByUser,
    getSubscriptionAnalytics,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
};
