"use client";

import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SidebarRoutes } from "./sidebar-routes";
import { ProfileActions } from "@/components/profile-actions";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="h-20 flex items-center justify-center border-b">
        <h1 className="text-2xl font-bold text-sky-700">Bodh Admin</h1>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarRoutes />
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <ProfileActions logoutVariant="text" className="flex items-center justify-between" />
      </SidebarFooter>
    </Sidebar>
  );
}
