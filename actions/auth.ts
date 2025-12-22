"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth, signOut as authSignOut } from "@/auth";

// Signup Schema
const SignupSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function signup(prevState: any, formData: FormData) {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid fields. Failed to sign up.",
    };
  }

  const { name, email, password } = validatedFields.data;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        errors: {
          email: ["Email already exists"],
        },
        message: "Email already in use.",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      message: "Database Error: Failed to create user.",
    };
  }
}

// Update Profile Schema
const UpdateProfileSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
});

export async function updateProfile(prevState: any, formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      message: "Unauthorized",
    };
  }

  const validatedFields = UpdateProfileSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid fields. Failed to update profile.",
    };
  }

  const { name } = validatedFields.data;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name },
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return {
      message: "Database Error: Failed to update profile.",
    };
  }
}

// Change Password Schema
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function changePassword(prevState: any, formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      message: "Unauthorized",
    };
  }

  const validatedFields = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid fields. Failed to change password.",
    };
  }

  const { currentPassword, newPassword } = validatedFields.data;

  try {
    // Get user with current password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.passwordHash) {
      return {
        message: "User not found.",
      };
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return {
        errors: {
          currentPassword: ["Current password is incorrect"],
        },
        message: "Current password is incorrect.",
      };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash },
    });

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return {
      message: "Database Error: Failed to change password.",
    };
  }
}

// Delete Account
export async function deleteAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      message: "Unauthorized",
    };
  }

  try {
    // Delete user (cascade deletes related data)
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    // Sign out
    await authSignOut({ redirect: false });

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      message: "Database Error: Failed to delete account.",
    };
  }
}
