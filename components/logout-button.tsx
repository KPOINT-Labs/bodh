"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export const LogoutButton = () => {
  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      className="w-full justify-start"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  );
};
