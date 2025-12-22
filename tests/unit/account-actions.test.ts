import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProfile, changePassword, deleteAccount } from '@/actions/auth';
import { prisma } from '@/lib/prisma';
import { auth, signOut } from '@/auth';
import bcrypt from 'bcryptjs';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signOut: vi.fn(),
}));

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Account Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('should update user name', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'Old Name', email: 'user@example.com' },
        expires: '2024-12-31',
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: '1',
        name: 'New Name',
        email: 'user@example.com',
        passwordHash: 'hash',
        phone: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      const formData = new FormData();
      formData.append('name', 'New Name');

      const result = await updateProfile(null, formData);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'New Name' },
      });
      expect(result).toEqual({ success: true });
    });

    it('should reject unauthorized access', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const formData = new FormData();
      formData.append('name', 'New Name');

      const result = await updateProfile(null, formData);

      expect(result.message).toBe('Unauthorized');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should require valid current password', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'User', email: 'user@example.com' },
        expires: '2024-12-31',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: '1',
        name: 'User',
        email: 'user@example.com',
        passwordHash: 'hashedOldPassword',
        phone: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const formData = new FormData();
      formData.append('currentPassword', 'wrongPassword');
      formData.append('newPassword', 'newPassword123');
      formData.append('confirmPassword', 'newPassword123');

      const result = await changePassword(null, formData);

      expect(result.errors?.currentPassword).toContain('Current password is incorrect');
    });

    it('should update passwordHash on successful password change', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'User', email: 'user@example.com' },
        expires: '2024-12-31',
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: '1',
        name: 'User',
        email: 'user@example.com',
        passwordHash: 'hashedOldPassword',
        phone: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedNewPassword' as never);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: '1',
        name: 'User',
        email: 'user@example.com',
        passwordHash: 'hashedNewPassword',
        phone: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      const formData = new FormData();
      formData.append('currentPassword', 'oldPassword123');
      formData.append('newPassword', 'newPassword123');
      formData.append('confirmPassword', 'newPassword123');

      const result = await changePassword(null, formData);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: 'hashedNewPassword' },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteAccount', () => {
    it('should remove user from database', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'User', email: 'user@example.com' },
        expires: '2024-12-31',
      } as any);

      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: '1',
        name: 'User',
        email: 'user@example.com',
        passwordHash: 'hash',
        phone: null,
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      });

      vi.mocked(signOut).mockResolvedValue(undefined as any);

      const result = await deleteAccount();

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(signOut).toHaveBeenCalledWith({ redirect: false });
      expect(result).toEqual({ success: true });
    });

    it('should reject unauthorized access', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const result = await deleteAccount();

      expect(result.message).toBe('Unauthorized');
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});
