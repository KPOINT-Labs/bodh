import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  // Redirect authenticated users to /courses
  if (session?.user) {
    redirect("/courses");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center bg-white px-16 py-32 dark:bg-black">
        <h1 className="mb-8 font-semibold text-4xl text-black tracking-tight dark:text-zinc-50">
          Welcome to Bodh
        </h1>
        <Link href="/courses">
          <Button size="lg">Start Learning</Button>
        </Link>
      </main>
    </div>
  );
}
