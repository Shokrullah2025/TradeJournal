import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Billing from '../src/pages/Billing';
import { AuthProvider } from '../src/context/AuthContext';
import { BillingProvider } from '../src/context/BillingContext';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const Wrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <BillingProvider>
        {children}
      </BillingProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Billing Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render billing page with pricing plans', () => {
    render(
      <Wrapper>
        <Billing />
      </Wrapper>
    );

    expect(screen.getByText('Choose Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('should show billing cycle toggle', () => {
    render(
      <Wrapper>
        <Billing />
      </Wrapper>
    );

    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Yearly')).toBeInTheDocument();
  });

  it('should update prices when billing cycle changes', () => {
    render(
      <Wrapper>
        <Billing />
      </Wrapper>
    );

    // Click on yearly toggle
    const yearlyButton = screen.getByText('Yearly');
    fireEvent.click(yearlyButton);

    // Prices should update to yearly rates
    expect(screen.getByText('$290')).toBeInTheDocument(); // Premium yearly
    expect(screen.getByText('$990')).toBeInTheDocument(); // Enterprise yearly
  });

  it('should open payment form when upgrade button is clicked', () => {
    render(
      <Wrapper>
        <Billing />
      </Wrapper>
    );

    // Find and click upgrade button for Premium plan
    const upgradeButtons = screen.getAllByText(/Upgrade to/);
    fireEvent.click(upgradeButtons[0]);

    // Payment form should appear
    expect(screen.getByText('Payment Details')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('1234 5678 9012 3456')).toBeInTheDocument();
  });

  it('should validate payment form inputs', async () => {
    render(
      <Wrapper>
        <Billing />
      </Wrapper>
    );

    // Open payment form
    const upgradeButtons = screen.getAllByText(/Upgrade to/);
    fireEvent.click(upgradeButtons[0]);

    // Try to submit empty form
    const submitButton = screen.getByText('Complete Payment');
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Card number is required')).toBeInTheDocument();
    });
  });

  it('should process payment successfully with valid data', async () => {
    const { toast } = await import('react-hot-toast');
    
    render(
      <Wrapper>
        <Billing />
      </Wrapper>
    );

    // Open payment form
    const upgradeButtons = screen.getAllByText(/Upgrade to/);
    fireEvent.click(upgradeButtons[0]);

    // Fill out form with valid data
    fireEvent.change(screen.getByPlaceholderText('1234 5678 9012 3456'), {
      target: { value: '4242424242424242' }
    });
    fireEvent.change(screen.getByPlaceholderText('MM/YY'), {
      target: { value: '12/25' }
    });
    fireEvent.change(screen.getByPlaceholderText('123'), {
      target: { value: '123' }
    });
    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Test User' }
    });

    // Submit form
    const submitButton = screen.getByText('Complete Payment');
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByRole('button', { name: /complete payment/i })).toBeDisabled();

    // Wait for payment processing
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Payment processed successfully! Your subscription has been updated.'
      );
    }, { timeout: 3000 });
  });
});
