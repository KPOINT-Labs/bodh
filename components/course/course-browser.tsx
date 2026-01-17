import Link from 'next/link';
import { BookOpen, Brain, Sparkles } from 'lucide-react';

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
  'from-purple-600 to-pink-600',
  'from-blue-600 to-indigo-600',
  'from-green-600 to-emerald-600',
  'from-orange-600 to-red-600',
  'from-cyan-600 to-blue-600',
];

const borderColorMap = [
  'border-purple-500/50 hover:border-purple-400',
  'border-blue-500/50 hover:border-blue-400',
  'border-green-500/50 hover:border-green-400',
  'border-orange-500/50 hover:border-orange-400',
  'border-cyan-500/50 hover:border-cyan-400',
];

export function CourseBrowser({ courses }: CourseBrowserProps) {
  // Filter out courses without valid first module/lesson
  const validCourses = courses.filter(
    (course) => course.firstModule?.firstLesson
  );

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Choose Your Learning Path</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {validCourses.map((course, index) => {
            const colorIndex = index % colorMap.length;
            const gradientColor = colorMap[colorIndex];
            const borderColor = borderColorMap[colorIndex];

            // Build the URL for navigation
            const href = `/course/${course.id}/module/${course.firstModule!.id}?lesson=${course.firstModule!.firstLesson!.id}`;

            return (
              <Link
                key={course.id}
                href={href}
                className={`group relative bg-white border-2 ${borderColor} rounded-2xl p-6 transition-all duration-300 hover:shadow-lg text-left block`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rounded-2xl"></div>

                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center mb-4 opacity-70 group-hover:opacity-100 transition-opacity shadow-md`}>
                    <Brain className="w-6 h-6 text-white" />
                  </div>

                  <h4 className="text-base font-semibold text-gray-700 group-hover:text-gray-900 transition-colors mb-2">
                    {course.title}
                  </h4>

                  {course.description && (
                    <p className="text-gray-600 group-hover:text-gray-700 text-sm mb-3">
                      {course.description}
                    </p>
                  )}

                  {course._count?.modules !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 group-hover:text-gray-700 transition-colors">
                      <BookOpen className="w-3 h-3" />
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
