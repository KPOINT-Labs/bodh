"use client";

import { Plus, BookOpen, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// Mock data for courses
const courses = [
  {
    id: "computational-thinking",
    title: "Computational Thinking",
    progress: 15,
    isActive: true,
    duration: "15 min",
  },
  {
    id: "professional-growth",
    title: "Professional Growth",
    progress: 0,
    isActive: false,
    status: "Yet to start",
    duration: "10 min",
  },
];

export function CourseSidebar() {
  return (
    <Sidebar className="shadow-[4px_4px_20px_0px_rgba(0,0,0,0.1)]">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                New Course
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>My Courses</SidebarGroupLabel>
          <SidebarGroupAction>
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {courses.map((course) => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={course.isActive}
                    className="flex-col items-start h-auto py-3"
                  >
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2 w-full">
                        <BookOpen className="h-4 w-4 shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {course.title}
                        </span>
                      </div>

                      <div className="w-full space-y-1">
                        <div className="flex items-center gap-2 w-full">
                          <Progress value={course.progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {course.progress}%
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {course.status ? course.status : `In Progress • ${course.duration}`}
                        </p>
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="justify-start">
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">User</span>
                <span className="text-xs text-muted-foreground">Student</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}