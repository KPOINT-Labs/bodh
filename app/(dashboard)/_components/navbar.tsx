"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export const Navbar = () => {
  return (
    <div className="p-4 border-b h-full flex items-center bg-white shadow-sm">
      <SidebarTrigger className="md:hidden" />
      <div className="flex gap-x-2 ml-auto">
        {/* User Button or other actions can go here */}
      </div>
    </div>
  );
};
