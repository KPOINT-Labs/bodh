"use client";

import { Layout, List } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const guestRoutes = [
  {
    icon: Layout,
    label: "Dashboard",
    href: "/teacher/analytics", // Changed to analytics for now to distinguish
  },
  {
    icon: List,
    label: "Courses",
    href: "/teacher/courses",
  },
];

export const SidebarRoutes = () => {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {guestRoutes.map((route) => {
        const isActive =
          (pathname === "/" && route.href === "/") ||
          pathname === route.href ||
          pathname?.startsWith(`${route.href}/`);

        return (
          <SidebarMenuItem key={route.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={route.label}
            >
              <Link
                href={route.href}
                className={cn(
                  "flex items-center gap-x-2 text-slate-500 text-sm font-[500] pl-6 transition-all hover:text-slate-600 hover:bg-slate-300/20",
                  isActive && "text-sky-700 bg-sky-200/20 hover:bg-sky-200/20 hover:text-sky-700"
                )}
              >
                <route.icon
                  size={22}
                  className={cn("text-slate-500", isActive && "text-sky-700")}
                />
                {route.label}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};
