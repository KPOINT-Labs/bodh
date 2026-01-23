"use client";

import { BookOpen, Plus, User } from "lucide-react";
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
} from "@/components/ui/sidebar";

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
            <SidebarMenuButton asChild size="lg">
              <Button className="w-full justify-start gap-2" variant="outline">
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
                    className="h-auto flex-col items-start py-3"
                    isActive={course.isActive}
                  >
                    <div className="w-full space-y-2">
                      <div className="flex w-full items-center gap-2">
                        <BookOpen className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium text-sm">
                          {course.title}
                        </span>
                      </div>

                      <div className="w-full space-y-1">
                        <div className="flex w-full items-center gap-2">
                          <Progress
                            className="h-1.5 flex-1"
                            value={course.progress}
                          />
                          <span className="text-muted-foreground text-xs">
                            {course.progress}%
                          </span>
                        </div>

                        <p className="text-muted-foreground text-xs">
                          {course.status
                            ? course.status
                            : `In Progress • ${course.duration}`}
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
            <SidebarMenuButton className="justify-start" size="lg">
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="font-medium text-sm">User</span>
                <span className="text-muted-foreground text-xs">Student</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
