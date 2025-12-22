import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import SignupPage from '@/app/(auth)/signup/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the signup action
vi.mock('@/actions/auth', () => ({
  signup: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Signup Page', () => {
  it('should render all form fields', () => {
    render(<SignupPage />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    const passwordFields = screen.getAllByLabelText(/password/i);
    expect(passwordFields).toHaveLength(2); // Password and Confirm Password
  });

  it('should render a link to login page', () => {
    render(<SignupPage />);

    const loginLink = screen.getByText(/already have an account/i);
    expect(loginLink).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const passwordInputs = screen.getAllByLabelText(/password/i);
    await user.type(passwordInputs[0], 'short');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for mismatched passwords', async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    const passwordInputs = screen.getAllByLabelText(/password/i);
    await user.type(passwordInputs[0], 'password123');
    await user.type(passwordInputs[1], 'differentPassword');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });
});
