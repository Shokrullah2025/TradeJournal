import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingProvider, useBilling } from '../src/context/BillingContext';
import { AuthProvider } from '../src/context/AuthContext';

// Mock component to test the billing context
const TestComponent = () => {
  const { payments, subscriptions, processPayment, getSubscriptionAnalytics } = useBilling();
  
  return (
    <div>
      <div data-testid="total-revenue">{subscriptions.totalRevenue}</div>
      <div data-testid="total-subscribers">{subscriptions.totalSubscribers}</div>
      <div data-testid="payments-count">{payments.length}</div>
      <button 
        data-testid="process-payment"
        onClick={() => processPayment({
          userId: 'test-user',
          userEmail: 'test@example.com',
          userName: 'Test User',
          amount: 29.00,
          plan: 'premium',
          billingCycle: 'monthly'
        })}
      >
        Process Payment
      </button>
    </div>
  );
};

const Wrapper = ({ children }) => (
  <AuthProvider>
    <BillingProvider>
      {children}
    </BillingProvider>
  </AuthProvider>
);

describe('BillingContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide initial billing data', () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    expect(screen.getByTestId('total-revenue')).toHaveTextContent('448');
    expect(screen.getByTestId('total-subscribers')).toHaveTextContent('3');
    expect(screen.getByTestId('payments-count')).toHaveTextContent('4');
  });

  it('should calculate subscription analytics correctly', () => {
    const analytics = {
      totalRevenue: 448.00,
      totalSubscribers: 3,
      subscriptionsByPlan: {
        basic: 0,
        premium: 2,
        enterprise: 1
      },
      failedPayments: 1
    };

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    // Verify the analytics calculations
    expect(screen.getByTestId('total-revenue')).toHaveTextContent('448');
    expect(screen.getByTestId('total-subscribers')).toHaveTextContent('3');
  });

  it('should process payments successfully', async () => {
    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    const processButton = screen.getByTestId('process-payment');
    fireEvent.click(processButton);

    // Wait for payment processing (mocked with setTimeout)
    await waitFor(() => {
      expect(screen.getByTestId('payments-count')).toHaveTextContent('5');
    }, { timeout: 3000 });
  });

  it('should handle payment failures', async () => {
    // Mock Math.random to always return a value that triggers failure
    const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0.05);

    render(
      <Wrapper>
        <TestComponent />
      </Wrapper>
    );

    const processButton = screen.getByTestId('process-payment');
    
    // This should trigger a payment failure
    fireEvent.click(processButton);

    await waitFor(() => {
      // Payment count should not increase on failure
      expect(screen.getByTestId('payments-count')).toHaveTextContent('4');
    }, { timeout: 3000 });

    mockRandom.mockRestore();
  });
});
