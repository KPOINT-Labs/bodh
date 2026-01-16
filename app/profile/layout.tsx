import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/courses"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Courses</span>
            </Link>
          </div>

          <Link href="/courses" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 hidden sm:inline">Bodh</span>
          </Link>

          <LogoutButton variant="default" />
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">{children}</main>
    </div>
  );
}
