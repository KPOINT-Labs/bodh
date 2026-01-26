"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  variant?: "default" | "icon" | "text";
}

export function LogoutButton({
  className,
  variant = "default",
}: LogoutButtonProps) {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  if (variant === "icon") {
    return (
      <button
        className={cn(
          "rounded-lg p-2 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700",
          className
        )}
        onClick={handleLogout}
        title="Sign out"
      >
        <LogOut className="h-5 w-5" />
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        className={cn(
          "flex items-center gap-2 text-gray-500 transition-all hover:text-gray-700",
          className
        )}
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    );
  }

  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-all hover:bg-gray-200",
        className
      )}
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
