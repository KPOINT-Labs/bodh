"use client";

import { useState } from "react";
import { Plus, BookOpen, User, PanelLeftClose } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CourseWithProgress } from "@/types/course";
import { CourseCard } from "./course-card";
import { CourseEnrollmentDialog } from "./course-enrollment-dialog";
import { CourseDetailView } from "./course-detail-view";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CourseSidebarProps {
  courses: CourseWithProgress[];
  user: {
    name: string;
    email: string;
    avatar: string | null;
  };
}

export function CourseSidebar({ courses, user }: CourseSidebarProps) {
  const { toggleSidebar } = useSidebar();
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const handleCourseClick = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const handleBackToList = () => {
    setSelectedCourseId(null);
  };

  // Get user initials for avatar fallback
  const userInitials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <Sidebar className="shadow-[4px_4px_20px_0px_rgba(0,0,0,0.1)]">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start gap-2"
                  onClick={() => setEnrollmentDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  New Course
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="shrink-0"
                >
                  <PanelLeftClose className="h-4 w-4 text-gray-600" />
                </Button>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              My Courses
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <ScrollArea className="h-[calc(100vh-280px)]">
                {selectedCourse ? (
                  <div className="px-2 pt-2">
                    <CourseDetailView
                      course={selectedCourse}
                      onBack={handleBackToList}
                    />
                  </div>
                ) : (
                  <div className="space-y-3 px-2 pt-2">
                    {courses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No courses yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Click "New Course" to get started
                        </p>
                      </div>
                    ) : (
                      courses.map((course) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          onClick={() => handleCourseClick(course.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="justify-start">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar || ""} />
                  <AvatarFallback>
                    {userInitials || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">Student</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <CourseEnrollmentDialog
        open={enrollmentDialogOpen}
        onOpenChange={setEnrollmentDialogOpen}
      />
    </>
  );
}