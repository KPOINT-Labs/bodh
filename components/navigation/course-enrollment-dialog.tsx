"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAvailableCourses, enrollInCourse } from "@/actions/enrollment";
import { AvailableCourse } from "@/types/course";
import { formatDuration } from "@/lib/course-progress";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CourseEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CourseEnrollmentDialog({
  open,
  onOpenChange,
}: CourseEnrollmentDialogProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCourses();
    }
  }, [open]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const availableCourses = await getAvailableCourses();
      setCourses(availableCourses);
    } catch (error) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const result = await enrollInCourse(courseId);

      if (result.success) {
        toast.success(result.message);
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to enroll in course");
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Browse Courses</DialogTitle>
          <DialogDescription>
            Explore and enroll in new courses to expand your learning
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No new courses available</p>
              <p className="text-xs text-gray-400 mt-1">
                You're enrolled in all published courses
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-600 shrink-0" />
                        <h4 className="font-medium text-sm text-gray-900">
                          {course.title}
                        </h4>
                      </div>

                      {course.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {course.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDuration(course.estimatedDuration)}</span>
                        </div>
                        {course._count && (
                          <span>
                            {course._count.lessons}{" "}
                            {course._count.lessons === 1 ? "lesson" : "lessons"}
                          </span>
                        )}
                        <span className="capitalize text-blue-600">
                          {course.difficulty}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId === course.id}
                    >
                      {enrollingId === course.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        "Enroll"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
