"use client";

import { ProfileActions } from "@/components/profile-actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarRoutes } from "./sidebar-routes";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="flex h-20 items-center justify-center border-b">
        <h1 className="font-bold text-2xl text-sky-700">Bodh Admin</h1>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarRoutes />
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <ProfileActions
          className="flex items-center justify-between"
          logoutVariant="text"
        />
      </SidebarFooter>
    </Sidebar>
  );
}
