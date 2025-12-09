import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50 mb-8">
          Welcome to Bodh
        </h1>
        <Link href="/course/computational-thinking/lesson/lesson-1">
          <Button size="lg">
            Start Learning
          </Button>
        </Link>
      </main>
    </div>
  );
}