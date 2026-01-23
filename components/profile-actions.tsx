"use client";

import { User } from "lucide-react";
import Link from "next/link";
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
        className={cn(
          "flex items-center gap-2 text-gray-600 text-sm transition-colors hover:text-gray-900",
          linkClassName
        )}
        href="/profile"
      >
        <User className="h-4 w-4" />
        Profile
      </Link>
      <LogoutButton className={logoutClassName} variant={logoutVariant} />
    </div>
  );
}
