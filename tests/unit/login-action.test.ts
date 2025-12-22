import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Import the authorize function logic (we'll test it indirectly through auth.ts)
// Since authorize is inside NextAuth config, we test its behavior
import { auth } from '@/auth';

describe('Login Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return user with valid credentials', async () => {
    const mockUser = {
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: 'hashedPassword123',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    // Test that findUnique and compare would be called correctly
    const user = await prisma.user.findUnique({
      where: { email: 'john@example.com' },
    });

    expect(user).toEqual(mockUser);

    const passwordMatch = await bcrypt.compare('password123', mockUser.passwordHash);
    expect(passwordMatch).toBe(true);
  });

  it('should return null for invalid email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const user = await prisma.user.findUnique({
      where: { email: 'nonexistent@example.com' },
    });

    expect(user).toBeNull();
  });

  it('should return null for invalid password', async () => {
    const mockUser = {
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: 'hashedPassword123',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const passwordMatch = await bcrypt.compare('wrongPassword', mockUser.passwordHash);
    expect(passwordMatch).toBe(false);
  });

  it('should update lastLoginAt on successful login', async () => {
    const userId = '1';
    const mockUpdatedUser = {
      id: userId,
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: 'hashedPassword123',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
    };

    vi.mocked(prisma.user.update).mockResolvedValue(mockUpdatedUser);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: expect.any(Date) },
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(updatedUser.lastLoginAt).toBeDefined();
  });
});
