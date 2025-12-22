import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signup } from '@/actions/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

describe('Signup Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new user with valid credentials', async () => {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');
    formData.append('password', 'password123');
    formData.append('confirmPassword', 'password123');

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123' as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: 'hashedPassword123',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    const result = await signup(null, formData);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'john@example.com' },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        passwordHash: 'hashedPassword123',
      },
    });
    expect(result).toEqual({ success: true });
  });

  it('should reject duplicate email', async () => {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'existing@example.com');
    formData.append('password', 'password123');
    formData.append('confirmPassword', 'password123');

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      email: 'existing@example.com',
      name: 'Existing User',
      passwordHash: 'hash',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    const result = await signup(null, formData);

    expect(result).toHaveProperty('errors');
    expect(result.errors).toHaveProperty('email');
    expect(result.errors?.email).toContain('Email already exists');
  });

  it('should reject mismatched passwords', async () => {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');
    formData.append('password', 'password123');
    formData.append('confirmPassword', 'differentPassword');

    const result = await signup(null, formData);

    expect(result).toHaveProperty('errors');
    expect(result.message).toContain('Passwords do not match');
  });

  it('should reject weak passwords (less than 8 characters)', async () => {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');
    formData.append('password', 'short');
    formData.append('confirmPassword', 'short');

    const result = await signup(null, formData);

    expect(result).toHaveProperty('errors');
    expect(result.errors).toHaveProperty('password');
  });

  it('should reject invalid email format', async () => {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'invalid-email');
    formData.append('password', 'password123');
    formData.append('confirmPassword', 'password123');

    const result = await signup(null, formData);

    expect(result).toHaveProperty('errors');
    expect(result.errors).toHaveProperty('email');
  });

  it('should hash the password (not store plain text)', async () => {
    const formData = new FormData();
    formData.append('name', 'John Doe');
    formData.append('email', 'john@example.com');
    formData.append('password', 'password123');
    formData.append('confirmPassword', 'password123');

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123' as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: '1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: 'hashedPassword123',
      phone: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    });

    await signup(null, formData);

    // Verify bcrypt.hash was called with the password
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

    // Verify the user was created with the hashed password, not the plain one
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        passwordHash: 'hashedPassword123',
      }),
    });
    expect(prisma.user.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({
        passwordHash: 'password123',
      }),
    });
  });
});
