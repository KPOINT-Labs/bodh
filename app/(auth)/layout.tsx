export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-violet-50 via-fuchsia-50 to-cyan-50 p-4">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-blob rounded-full bg-violet-300/30 blur-3xl" />
        <div className="animation-delay-2000 absolute top-1/3 right-1/4 h-96 w-96 animate-blob rounded-full bg-fuchsia-300/30 blur-3xl" />
        <div className="animation-delay-4000 absolute bottom-1/4 left-1/3 h-96 w-96 animate-blob rounded-full bg-cyan-300/30 blur-3xl" />
      </div>

      {children}
    </div>
  );
}
