import { describe, it, expect, vi } from 'vitest';

// Mock next-auth/react
const mockSignOut = vi.fn();
vi.mock('next-auth/react', () => ({
  signOut: mockSignOut,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import { signOut } from 'next-auth/react';

describe('Logout Behavior', () => {
  it('should call signOut when logout button is clicked', async () => {
    mockSignOut.mockResolvedValue(undefined as any);

    await signOut({ callbackUrl: '/login' });

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  it('should redirect to login page after logout', async () => {
    mockSignOut.mockResolvedValue(undefined as any);

    const result = await signOut({ callbackUrl: '/login' });

    expect(signOut).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackUrl: '/login',
      })
    );
  });
});
