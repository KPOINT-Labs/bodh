import { redirect } from "next/navigation";
import { isSignupEnabled } from "@/lib/config";
import SignupContent from "./SignupContent";

export default function SignupPage() {
  if (!isSignupEnabled()) {
    redirect("/login");
  }

  return <SignupContent />;
}
