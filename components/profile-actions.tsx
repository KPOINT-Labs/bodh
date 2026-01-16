"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/utils";

interface ProfileActionsProps {
  className?: string;
  linkClassName?: string;
  logoutClassName?: string;
  logoutVariant?: "default" | "icon" | "text";
  layout?: "inline" | "stacked";
}

export function ProfileActions({
  className,
  linkClassName,
  logoutClassName,
  logoutVariant = "text",
  layout = "inline",
}: ProfileActionsProps) {
  const wrapperClasses =
    layout === "stacked"
      ? "flex flex-col items-start gap-2"
      : "flex items-center justify-between gap-2";

  return (
    <div className={cn(wrapperClasses, className)}>
      <Link
        href="/profile"
        className={cn(
          "flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors",
          linkClassName
        )}
      >
        <User className="w-4 h-4" />
        Profile
      </Link>
      <LogoutButton variant={logoutVariant} className={logoutClassName} />
    </div>
  );
}
