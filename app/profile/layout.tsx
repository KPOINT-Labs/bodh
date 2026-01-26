import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-gray-200 border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
              href="/courses"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back to Courses</span>
            </Link>
          </div>

          <Link className="flex items-center gap-2" href="/courses">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="hidden font-semibold text-gray-900 sm:inline">
              Bodh
            </span>
          </Link>

          <LogoutButton variant="default" />
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">{children}</main>
    </div>
  );
}
