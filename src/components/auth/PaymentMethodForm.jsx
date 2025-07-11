import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PaymentMethodForm = ({ onPaymentMethodAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
    email: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Validate card number using Luhn algorithm
  const validateCardNumber = (number) => {
    const num = number.replace(/\s+/g, '');
    if (num.length < 13 || num.length > 19) return false;
    
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0;
  };

  // Get card type from number
  const getCardType = (number) => {
    const num = number.replace(/\s+/g, '');
    if (num.match(/^4/)) return 'visa';
    if (num.match(/^5[1-5]/)) return 'mastercard';
    if (num.match(/^3[47]/)) return 'amex';
    if (num.match(/^6/)) return 'discover';
    return 'unknown';
  };

  const handleInputChange = (field, value) => {
    if (field === 'number') {
      value = formatCardNumber(value);
    } else if (field === 'expiry') {
      value = formatExpiry(value);
    } else if (field === 'cvc') {
      value = value.replace(/[^0-9]/g, '').substring(0, 4);
    }

    setCardData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleAddressChange = (field, value) => {
    setCardData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate card number
    if (!cardData.number) {
      newErrors.number = 'Card number is required';
    } else if (!validateCardNumber(cardData.number)) {
      newErrors.number = 'Invalid card number';
    }

    // Validate expiry
    if (!cardData.expiry) {
      newErrors.expiry = 'Expiry date is required';
    } else {
      const [month, year] = cardData.expiry.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (!month || !year || month < 1 || month > 12) {
        newErrors.expiry = 'Invalid expiry date';
      } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiry = 'Card has expired';
      }
    }

    // Validate CVC
    if (!cardData.cvc) {
      newErrors.cvc = 'CVC is required';
    } else if (cardData.cvc.length < 3 || cardData.cvc.length > 4) {
      newErrors.cvc = 'Invalid CVC';
    }

    // Validate name
    if (!cardData.name.trim()) {
      newErrors.name = 'Cardholder name is required';
    }

    // Validate email
    if (!cardData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Validate address
    if (!cardData.address.line1.trim()) {
      newErrors.address_line1 = 'Address is required';
    }
    if (!cardData.address.city.trim()) {
      newErrors.address_city = 'City is required';
    }
    if (!cardData.address.state.trim()) {
      newErrors.address_state = 'State is required';
    }
    if (!cardData.address.postal_code.trim()) {
      newErrors.address_postal_code = 'ZIP code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // In a real app, you would use Stripe.js to create a payment method
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful payment method creation
      const mockPaymentMethodId = 'pm_' + Math.random().toString(36).substring(7);
      
      const response = await fetch('/api/user/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          payment_method_id: mockPaymentMethodId,
          billing_name: cardData.name,
          billing_email: cardData.email,
          billing_address: cardData.address
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Payment method verified successfully!');
        onPaymentMethodAdded?.(data);
      } else {
        toast.error(data.error || 'Failed to verify payment method');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const cardType = getCardType(cardData.number);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mx-auto">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Add Payment Method
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Add your credit card to start your 7-day free trial. You won't be charged until your trial ends.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Secure Payment Processing
            </span>
          </div>
          <p className="mt-1 text-sm text-blue-700">
            Your payment information is encrypted and secure. We'll charge $1 to verify your card and immediately refund it.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card Number */}
          <div>
            <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
              Card Number
            </label>
            <div className="mt-1 relative">
              <input
                type="text"
                id="cardNumber"
                value={cardData.number}
                onChange={(e) => handleInputChange('number', e.target.value)}
                className={`appearance-none block w-full px-3 py-2 border ${
                  errors.number ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="1234 5678 9012 3456"
                maxLength="19"
              />
              {cardType !== 'unknown' && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {cardType}
                  </span>
                </div>
              )}
            </div>
            {errors.number && (
              <p className="mt-1 text-sm text-red-600">{errors.number}</p>
            )}
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">
                Expiry Date
              </label>
              <input
                type="text"
                id="expiry"
                value={cardData.expiry}
                onChange={(e) => handleInputChange('expiry', e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.expiry ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="MM/YY"
                maxLength="5"
              />
              {errors.expiry && (
                <p className="mt-1 text-sm text-red-600">{errors.expiry}</p>
              )}
            </div>

            <div>
              <label htmlFor="cvc" className="block text-sm font-medium text-gray-700">
                CVC
              </label>
              <input
                type="text"
                id="cvc"
                value={cardData.cvc}
                onChange={(e) => handleInputChange('cvc', e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.cvc ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="123"
                maxLength="4"
              />
              {errors.cvc && (
                <p className="mt-1 text-sm text-red-600">{errors.cvc}</p>
              )}
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Cardholder Name
            </label>
            <input
              type="text"
              id="name"
              value={cardData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              placeholder="John Doe"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={cardData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Billing Address</h3>
            
            <div>
              <label htmlFor="address_line1" className="block text-sm font-medium text-gray-700">
                Address Line 1
              </label>
              <input
                type="text"
                id="address_line1"
                value={cardData.address.line1}
                onChange={(e) => handleAddressChange('line1', e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.address_line1 ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="123 Main St"
              />
              {errors.address_line1 && (
                <p className="mt-1 text-sm text-red-600">{errors.address_line1}</p>
              )}
            </div>

            <div>
              <label htmlFor="address_line2" className="block text-sm font-medium text-gray-700">
                Address Line 2 (Optional)
              </label>
              <input
                type="text"
                id="address_line2"
                value={cardData.address.line2}
                onChange={(e) => handleAddressChange('line2', e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  id="city"
                  value={cardData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.address_city ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="New York"
                />
                {errors.address_city && (
                  <p className="mt-1 text-sm text-red-600">{errors.address_city}</p>
                )}
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  id="state"
                  value={cardData.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.address_state ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="NY"
                />
                {errors.address_state && (
                  <p className="mt-1 text-sm text-red-600">{errors.address_state}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                ZIP Code
              </label>
              <input
                type="text"
                id="postal_code"
                value={cardData.address.postal_code}
                onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.address_postal_code ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="10001"
              />
              {errors.address_postal_code && (
                <p className="mt-1 text-sm text-red-600">{errors.address_postal_code}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying Payment Method...
                </div>
              ) : (
                <div className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Verify Payment Method
                </div>
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By adding your payment method, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodForm;
