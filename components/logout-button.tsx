"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "icon" | "text";
}

export function LogoutButton({ className, variant = "default" }: LogoutButtonProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleLogout}
        className={cn(
          "p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all",
          className
        )}
        title="Sign out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        onClick={handleLogout}
        className={cn(
          "text-gray-500 hover:text-gray-700 transition-all flex items-center gap-2",
          className
        )}
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2",
        className
      )}
    >
      <LogOut className="w-4 h-4" />
      Sign out
    </button>
  );
}
