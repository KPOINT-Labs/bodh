import { prisma } from "@/lib/prisma";
import { WelcomeContent } from "./WelcomeContent";

// Render at request time (database required)
export const dynamic = "force-dynamic";

async function getLastAttendedCourse() {
  // Get the sample user
  const user = await prisma.user.findFirst({
    where: { email: "learner@bodh.app" },
  });

  if (!user) {
    return null;
  }

  // Find the most recent thread (conversation) for this user to get the last attended module
  const lastThread = await prisma.thread.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      module: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!lastThread?.module?.course) {
    return null;
  }

  return {
    courseId: lastThread.module.course.id,
    courseTitle: lastThread.module.course.title,
    moduleId: lastThread.module.id,
  };
}

async function getFirstAvailableCourse() {
  const course = await prisma.course.findFirst({
    where: {
      isPublished: true,
      modules: {
        some: {
          isPublished: true,
          lessons: {
            some: { isPublished: true },
          },
        },
      },
    },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { orderIndex: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!course || course.modules.length === 0) {
    return null;
  }

  return {
    courseId: course.id,
    moduleId: course.modules[0].id,
  };
}

async function getAllPublishedCourses() {
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      modules: {
        some: {
          isPublished: true,
          lessons: {
            some: { isPublished: true },
          },
        },
      },
    },
    include: {
      _count: {
        select: { modules: true },
      },
      modules: {
        where: { isPublished: true },
        orderBy: { orderIndex: "asc" },
        take: 1,
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { orderIndex: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to extract firstModule and firstLesson from arrays
  return courses.map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    _count: course._count,
    firstModule: course.modules[0]
      ? {
          id: course.modules[0].id,
          firstLesson: course.modules[0].lessons[0] || null,
        }
      : null,
  }));
}

export default async function CoursesPage() {
  const [lastCourse, firstCourse, allCourses] = await Promise.all([
    getLastAttendedCourse(),
    getFirstAvailableCourse(),
    getAllPublishedCourses(),
  ]);

  return (
    <WelcomeContent
      firstCourse={firstCourse}
      lastCourse={lastCourse}
      allCourses={allCourses}
    />
  );
}
