import { BookOpen, Brain, Sparkles } from "lucide-react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string | null;
  _count?: {
    modules: number;
  };
  firstModule: {
    id: string;
    firstLesson: {
      id: string;
    } | null;
  } | null;
}

interface CourseBrowserProps {
  courses: Course[];
}

const colorMap = [
  "from-purple-600 to-pink-600",
  "from-blue-600 to-indigo-600",
  "from-green-600 to-emerald-600",
  "from-orange-600 to-red-600",
  "from-cyan-600 to-blue-600",
];

const borderColorMap = [
  "border-purple-500/50 hover:border-purple-400",
  "border-blue-500/50 hover:border-blue-400",
  "border-green-500/50 hover:border-green-400",
  "border-orange-500/50 hover:border-orange-400",
  "border-cyan-500/50 hover:border-cyan-400",
];

export function CourseBrowser({ courses }: CourseBrowserProps) {
  // Filter out courses without valid first module/lesson
  const validCourses = courses.filter(
    (course) => course.firstModule?.firstLesson
  );

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="rounded-3xl border-2 border-gray-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h3 className="font-semibold text-gray-800 text-lg">
            Choose Your Learning Path
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {validCourses.map((course, index) => {
            const colorIndex = index % colorMap.length;
            const gradientColor = colorMap[colorIndex];
            const borderColor = borderColorMap[colorIndex];

            // Build the URL for navigation
            const href = `/course/${course.id}/module/${course.firstModule?.id}?lesson=${course.firstModule?.firstLesson?.id}`;

            return (
              <Link
                className={`group relative overflow-hidden border-2 bg-white ${borderColor} block rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg`}
                href={href}
                key={course.id}
              >
                <div className="absolute inset-0 translate-x-[-100%] rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />

                <div className="relative">
                  <div
                    className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradientColor} mb-4 flex items-center justify-center opacity-70 shadow-md transition-opacity group-hover:opacity-100`}
                  >
                    <Brain className="h-6 w-6 text-white" />
                  </div>

                  <h4 className="mb-2 font-semibold text-base text-gray-700 transition-colors group-hover:text-gray-900">
                    {course.title}
                  </h4>

                  {course.description && (
                    <p className="mb-3 text-gray-600 text-sm group-hover:text-gray-700">
                      {course.description}
                    </p>
                  )}

                  {course._count?.modules !== undefined && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs transition-colors group-hover:text-gray-700">
                      <BookOpen className="h-3 w-3" />
                      <span>{course._count.modules} modules</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
