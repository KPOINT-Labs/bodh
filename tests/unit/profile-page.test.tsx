import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfilePage from '@/app/(dashboard)/(routes)/profile/page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

describe('Profile Page', () => {
  it('should display user name and email', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    vi.mocked(prisma.enrollment.findMany).mockResolvedValue([]);

    const ProfilePageComponent = await ProfilePage();
    render(ProfilePageComponent);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should show empty state when no courses enrolled', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    vi.mocked(prisma.enrollment.findMany).mockResolvedValue([]);

    const ProfilePageComponent = await ProfilePage();
    render(ProfilePageComponent);

    expect(screen.getByText(/no courses enrolled/i)).toBeInTheDocument();
  });

  it('should show profile management actions', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
      expires: '2024-12-31',
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hash',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    vi.mocked(prisma.enrollment.findMany).mockResolvedValue([]);

    const ProfilePageComponent = await ProfilePage();
    render(ProfilePageComponent);

    expect(screen.getByText(/edit profile/i)).toBeInTheDocument();
    expect(screen.getByText(/change password/i)).toBeInTheDocument();
    expect(screen.getByText(/delete account/i)).toBeInTheDocument();
  });
});
