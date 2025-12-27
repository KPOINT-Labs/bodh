import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // TODO: Replace with actual authenticated user when auth is implemented
    // For now, use the sample user (created via scripts/create-sample-user.ts)
    const user = await prisma.user.findFirst({
      where: { email: "learner@bodh.app" },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found. Run: bun run scripts/create-sample-user.ts",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}
