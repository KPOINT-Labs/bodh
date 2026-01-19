"use server";

import { prisma } from "@/lib/prisma";

export async function updateLessonProgress({
  userId,
  lessonId,
  lastPosition,
  completionPercentage,
  videoEnded = false,
}: {
  userId: string;
  lessonId: string;
  lastPosition: number;
  completionPercentage: number;
  videoEnded?: boolean;
}) {
  console.log("[Server Action] updateLessonProgress called with:", {
    userId,
    lessonId,
    lastPosition,
    completionPercentage,
    videoEnded,
  });

  // Calculate status based on completion
  let status = "in_progress";
  let completedAt = null;

  if (videoEnded || completionPercentage >= 90) {
    status = "completed";
    completedAt = new Date();
  }

  console.log("[Server Action] Calculated status:", { status, completedAt });

  try {
    // Upsert progress (create or update)
    const result = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: { userId, lessonId },
      },
      update: {
        status,
        lastPosition,
        completionPercentage,
        lastAccessedAt: new Date(),
        ...(completedAt && { completedAt }),
      },
      create: {
        userId,
        lessonId,
        status,
        lastPosition,
        completionPercentage,
        lastAccessedAt: new Date(),
        completedAt,
      },
    });

    console.log("[Server Action] Progress saved successfully:", result.id);
  } catch (error) {
    console.error("[Server Action] Database error:", error);
    throw error;
  }
}

export async function getLessonProgress(userId: string, lessonId: string) {
  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { lastPosition: true, status: true },
  });

  return progress;
}
