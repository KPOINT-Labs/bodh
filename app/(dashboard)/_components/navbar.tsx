"use client";

import { ProfileActions } from "@/components/profile-actions";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Navbar = () => {
  return (
    <div className="flex h-full items-center border-b bg-white p-4 shadow-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="ml-auto flex items-center gap-x-2">
        <ProfileActions logoutVariant="icon" />
      </div>
    </div>
  );
};
