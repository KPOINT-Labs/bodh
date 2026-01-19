/**
 * Mock data for the interactive product tour
 * Used when accessing /course/demo/module/demo?tour=true
 */

export const mockTourData = {
  course: {
    id: "demo",
    title: "Product Tour Demo",
    description: "Learn how to use the BODH learning platform",
    learningObjectives: [
      "Understand how to navigate the platform",
      "Learn to interact with your AI companion",
      "Discover video lecture features",
    ],
  },

  module: {
    id: "demo",
    title: "Getting Started",
    courseId: "demo",
    orderIndex: 0,
    lessons: [
      {
        id: "lesson-1",
        title: "Introduction to Photosynthesis",
        orderIndex: 0,
        kpointVideoId: null,
        youtubeVideoId: null,
        description: "Learn the basics of how plants convert sunlight into energy",
        duration: 330, // 5:30
      },
      {
        id: "lesson-2",
        title: "Key Concepts",
        orderIndex: 1,
        kpointVideoId: null,
        youtubeVideoId: null,
        description: "Understanding chloroplasts and the light-dependent reactions",
        duration: 420, // 7:00
      },
      {
        id: "lesson-3",
        title: "Deep Dive",
        orderIndex: 2,
        kpointVideoId: null,
        youtubeVideoId: null,
        description: "Exploring the Calvin cycle and carbon fixation",
        duration: 540, // 9:00
      },
      {
        id: "lesson-4",
        title: "Practice Questions",
        orderIndex: 3,
        kpointVideoId: null,
        youtubeVideoId: null,
        description: "Test your knowledge with interactive questions",
        duration: 300, // 5:00
      },
    ],
  },

  chatMessages: [
    {
      id: "1",
      type: "ai" as const,
      content:
        "Hello! I'm your AI learning companion. I'll help you understand this lesson on Introduction to Photosynthesis.",
      enableAnimation: false,
    },
    {
      id: "2",
      type: "ai" as const,
      content:
        "As you watch the video, I'll pause to ask questions and make sure you're following along. Feel free to ask me anything!",
      enableAnimation: false,
    },
  ],

  // Placeholder video info for display
  videoPlaceholder: {
    title: "Introduction to Photosynthesis",
    description: "Learn how plants convert sunlight into energy",
    thumbnailText: "Demo Video",
  },
};

export type MockTourData = typeof mockTourData;
