"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { autoEnrollNewUser } from "./enrollment";

// Invite code validation - 6 digits where sum equals 16
function isValidInviteCode(code: string): boolean {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }
  const sum = code
    .split("")
    .reduce((acc, digit) => acc + Number.parseInt(digit, 10), 0);
  return sum === 16;
}

// Validation schemas
const signupSchema = z
  .object({
    inviteCode: z
      .string()
      .length(6, "Invite code must be 6 digits")
      .regex(/^\d{6}$/, "Invite code must contain only numbers")
      .refine(isValidInviteCode, "Invalid invite code"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export interface ActionResult {
  success: boolean;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function signup(formData: FormData): Promise<ActionResult> {
  const rawData = {
    inviteCode: formData.get("inviteCode") as string,
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedFields = signupSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return {
      success: false,
      error: "An account with this email already exists",
    };
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  // Auto-enroll in published courses
  await autoEnrollNewUser(createdUser.id);

  return { success: true };
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to update your profile",
    };
  }

  const rawData = {
    name: formData.get("name") as string,
  };

  const validatedFields = updateProfileSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name } = validatedFields.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function changePassword(
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to change your password",
    };
  }

  const rawData = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedFields = changePasswordSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return {
      success: false,
      error: "User not found",
    };
  }

  // Check if user signed up via OAuth (no password set)
  if (!user.passwordHash) {
    return {
      success: false,
      error:
        "You signed in with Google. Password change is not available for Google accounts.",
    };
  }

  // Verify current password
  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.passwordHash
  );

  if (!passwordMatch) {
    return {
      success: false,
      error: "Current password is incorrect",
    };
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newPasswordHash },
  });

  return { success: true };
}

export async function deleteAccount(): Promise<ActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to delete your account",
    };
  }

  // Delete user (cascade will delete related records)
  await prisma.user.delete({
    where: { id: session.user.id },
  });

  // Sign out the user
  await signOut({ redirect: false });

  return { success: true };
}
