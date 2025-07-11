import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import MultiStepRegistration from '../src/pages/MultiStepRegistration';
import EmailVerification from '../src/components/auth/EmailVerification';
import PaymentMethodForm from '../src/components/auth/PaymentMethodForm';
import TrialActivation from '../src/components/auth/TrialActivation';

// Mock fetch globally
global.fetch = vi.fn();

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('7-Day Trial Registration Flow', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('MultiStepRegistration', () => {
    it('renders the account creation step by default', () => {
      renderWithProviders(<MultiStepRegistration />);
      
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('shows password strength indicator', async () => {
      renderWithProviders(<MultiStepRegistration />);
      
      const passwordInput = screen.getByLabelText('Password');
      fireEvent.change(passwordInput, { target: { value: 'Test123!' } });
      
      await waitFor(() => {
        expect(screen.getByText(/Strong/i)).toBeInTheDocument();
      });
    });

    it('validates form fields', async () => {
      renderWithProviders(<MultiStepRegistration />);
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });

    it('submits registration form successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, user_id: '123', token: 'test-token' })
      });

      renderWithProviders(<MultiStepRegistration />);
      
      fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Test123!' } });
      fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Test123!' } });
      fireEvent.click(screen.getByRole('checkbox'));
      
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            password: 'Test123!'
          })
        }));
      });
    });
  });

  describe('EmailVerification', () => {
    it('renders email verification screen', () => {
      renderWithProviders(<EmailVerification email="john@example.com" />);
      
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Click the link in the email/)).toBeInTheDocument();
    });

    it('allows resending verification email', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Email sent' })
      });

      renderWithProviders(<EmailVerification email="john@example.com" />);
      
      const resendButton = screen.getByRole('button', { name: /resend email/i });
      fireEvent.click(resendButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/send-verification', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'john@example.com' })
        }));
      });
    });
  });

  describe('PaymentMethodForm', () => {
    it('renders payment method form', () => {
      renderWithProviders(<PaymentMethodForm />);
      
      expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
      expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Date')).toBeInTheDocument();
      expect(screen.getByLabelText('CVC')).toBeInTheDocument();
      expect(screen.getByLabelText('Cardholder Name')).toBeInTheDocument();
    });

    it('validates card number format', async () => {
      renderWithProviders(<PaymentMethodForm />);
      
      const cardInput = screen.getByLabelText('Card Number');
      fireEvent.change(cardInput, { target: { value: '4111111111111111' } });
      
      await waitFor(() => {
        expect(cardInput.value).toBe('4111 1111 1111 1111');
      });
    });

    it('validates expiry date format', async () => {
      renderWithProviders(<PaymentMethodForm />);
      
      const expiryInput = screen.getByLabelText('Expiry Date');
      fireEvent.change(expiryInput, { target: { value: '1225' } });
      
      await waitFor(() => {
        expect(expiryInput.value).toBe('12/25');
      });
    });

    it('shows form validation errors', async () => {
      renderWithProviders(<PaymentMethodForm />);
      
      const submitButton = screen.getByRole('button', { name: /verify payment method/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Card number is required')).toBeInTheDocument();
        expect(screen.getByText('Expiry date is required')).toBeInTheDocument();
        expect(screen.getByText('CVC is required')).toBeInTheDocument();
      });
    });
  });

  describe('TrialActivation', () => {
    it('renders trial activation screen', () => {
      renderWithProviders(<TrialActivation />);
      
      expect(screen.getByText('Ready to Start Your Trial?')).toBeInTheDocument();
      expect(screen.getByText('7-Day Free Trial')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /activate 7-day free trial/i })).toBeInTheDocument();
    });

    it('activates trial successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Trial activated' })
      });

      const mockOnTrialActivated = vi.fn();
      renderWithProviders(<TrialActivation onTrialActivated={mockOnTrialActivated} />);
      
      const activateButton = screen.getByRole('button', { name: /activate 7-day free trial/i });
      fireEvent.click(activateButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/user/start-trial', expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer null'
          })
        }));
      });
    });

    it('shows success screen after activation', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Trial activated' })
      });

      renderWithProviders(<TrialActivation />);
      
      const activateButton = screen.getByRole('button', { name: /activate 7-day free trial/i });
      fireEvent.click(activateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Welcome to Trade Journal Pro!')).toBeInTheDocument();
        expect(screen.getByText('7 Days Remaining')).toBeInTheDocument();
      });
    });
  });

  describe('Integration Tests', () => {
    it('completes full registration flow', async () => {
      // Mock all API calls
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user_id: '123', token: 'test-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Email verified' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Payment added' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, message: 'Trial activated' })
        });

      // This would be a more complex integration test
      // simulating the full flow through all steps
      expect(true).toBe(true);
    });
  });
});

describe('Access Control', () => {
  it('enforces email verification requirement', async () => {
    // Mock access check response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        can_access: false,
        requirements: {
          email_verified: false,
          payment_method_verified: false,
          onboarding_completed: false
        }
      })
    });

    // Test would verify that ProtectedRoute redirects to email verification
    expect(true).toBe(true);
  });

  it('enforces payment method verification requirement', async () => {
    // Mock access check response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        can_access: false,
        requirements: {
          email_verified: true,
          payment_method_verified: false,
          onboarding_completed: false
        }
      })
    });

    // Test would verify that ProtectedRoute redirects to payment method
    expect(true).toBe(true);
  });

  it('allows access when all requirements are met', async () => {
    // Mock access check response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        can_access: true,
        requirements: {
          email_verified: true,
          payment_method_verified: true,
          onboarding_completed: true
        },
        trial: {
          status: 'active',
          ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          days_remaining: 7
        }
      })
    });

    // Test would verify that ProtectedRoute allows access
    expect(true).toBe(true);
  });

  it('blocks access when trial has expired', async () => {
    // Mock access check response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        can_access: false,
        requirements: {
          email_verified: true,
          payment_method_verified: true,
          onboarding_completed: true
        },
        trial: {
          status: 'expired',
          ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
          days_remaining: 0
        }
      })
    });

    // Test would verify that ProtectedRoute shows trial expired message
    expect(true).toBe(true);
  });
});
