import { notFound, redirect } from "next/navigation";
import { ensureEnrollment } from "@/actions/enrollment";
import { getLiveKitToken } from "@/actions/livekit";
import { getSessionType } from "@/actions/session-type";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ModuleView } from "./ModuleView";

export const dynamic = "force-dynamic";

interface ModulePageProps {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}

async function getModuleData(courseIdOrSlug: string, moduleId: string) {
  // Find course by course_id, id, or slug
  const course = await prisma.course.findFirst({
    where: {
      OR: [
        { course_id: courseIdOrSlug },
        { id: courseIdOrSlug },
        { slug: courseIdOrSlug },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      learningObjectives: true,
    },
  });

  if (!course) return null;

  const module = await prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          kpointVideoId: true,
          youtubeVideoId: true,
          description: true,
          duration: true,
          quiz: true,
        },
      },
    },
  });

  if (!module || module.courseId !== course.id) return null;

  return { course, module };
}

export default async function ModulePageV2({
  params,
  searchParams,
}: ModulePageProps) {
  const { courseId, moduleId } = await params;
  const { lesson: lessonIdFromUrl } = await searchParams;

  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  // 2. Fetch data
  const data = await getModuleData(courseId, moduleId);
  if (!data) {
    notFound();
  }

  const { course, module } = data;

  // 3. Auto-enroll
  await ensureEnrollment(session.user.id, course.id);

  // 4. Determine initial lesson and session type
  const initialLesson = lessonIdFromUrl
    ? module.lessons.find((l) => l.id === lessonIdFromUrl) || module.lessons[0]
    : module.lessons[0];

  // Get session type from DB (course_welcome, course_welcome_back, lesson_welcome, lesson_welcome_back)
  const sessionTypeData = await getSessionType({
    userId: session.user.id,
    courseId: course.id,
    lessonId: initialLesson?.id,
  });

  // 5. Generate LiveKit token with full metadata
  const roomName = `${course.id}-${module.id}`;

  const liveKitToken = await getLiveKitToken({
    roomName,
    participantName: session.user.id,
    metadata: {
      agent_type: "bodh-agent",
      courseId: course.id,
      courseTitle: course.title,
      moduleId: module.id,
      moduleTitle: module.title,
      lessonId: initialLesson?.id,
      lessonTitle: initialLesson?.title,
      lessonNumber: sessionTypeData.lessonNumber,
      videoIds: initialLesson?.kpointVideoId
        ? [initialLesson.kpointVideoId]
        : [],
      learningObjectives: course.learningObjectives || [],
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      sessionType: sessionTypeData.sessionType,
      isFirstCourseVisit: sessionTypeData.isFirstCourseVisit,
      isIntroLesson: sessionTypeData.isIntroLesson,
      prevLessonTitle: sessionTypeData.prevLessonTitle,
    },
  });

  // 6. Redirect to error page if token generation failed
  if (!liveKitToken) {
    redirect("/error?reason=livekit_token_failed");
  }

  // 7. Pass to client component
  return (
    <ModuleView
      course={course}
      liveKitToken={liveKitToken}
      module={module}
      roomName={roomName}
      sessionType={sessionTypeData}
      userId={session.user.id}
      userName={session.user.name || "User"}
    />
  );
}
