"use client";

import { Layout, List } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
                className={cn(
                  "flex items-center gap-x-2 pl-6 font-[500] text-slate-500 text-sm transition-all hover:bg-slate-300/20 hover:text-slate-600",
                  isActive &&
                    "bg-sky-200/20 text-sky-700 hover:bg-sky-200/20 hover:text-sky-700"
                )}
                href={route.href}
              >
                <route.icon
                  className={cn("text-slate-500", isActive && "text-sky-700")}
                  size={22}
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
