"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarRoutes } from "./sidebar-routes";

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="h-20 flex items-center justify-center border-b">
        <h1 className="text-2xl font-bold text-sky-700">Bodh Admin</h1>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarRoutes />
      </SidebarContent>
    </Sidebar>
  );
}
