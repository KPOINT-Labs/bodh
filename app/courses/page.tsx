import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Clock, GraduationCap, ArrowLeft } from "lucide-react";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
    },
    include: {
      modules: {
        where: {
          isPublished: true,
        },
        include: {
          lessons: {
            where: {
              isPublished: true,
            },
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Helper function to get the first lesson of a course
  const getFirstLesson = (course: (typeof courses)[0]) => {
    for (const module of course.modules) {
      if (module.lessons.length > 0) {
        return module.lessons[0];
      }
    }
    return null;
  };

  // Helper function to count total lessons
  const getTotalLessons = (course: (typeof courses)[0]) => {
    return course.modules.reduce((total, module) => total + module.lessons.length, 0);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b bg-white dark:bg-zinc-900">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
              <p className="text-sm text-muted-foreground">
                Choose a course to start learning
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No courses available</h2>
            <p className="text-muted-foreground">
              Check back later for new courses.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const firstLesson = getFirstLesson(course);
              const totalLessons = getTotalLessons(course);
              const courseUrl = firstLesson
                ? `/course/${course.id}/lesson/${firstLesson.id}`
                : "#";

              return (
                <Link key={course.id} href={courseUrl}>
                  <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
                    {/* Thumbnail placeholder */}
                    <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-xl flex items-center justify-center">
                      <GraduationCap className="h-16 w-16 text-primary/40" />
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      {course.description && (
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="pb-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          <span>{course.modules.length} modules</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{totalLessons} lessons</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button className="w-full" disabled={!firstLesson}>
                        {firstLesson ? "Start Course" : "Coming Soon"}
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
