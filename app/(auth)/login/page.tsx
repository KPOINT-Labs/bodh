import { isSignupEnabled } from "@/lib/config";
import LoginContent from "./LoginContent";

export default function LoginPage() {
  const signupEnabled = isSignupEnabled();
  return <LoginContent signupEnabled={signupEnabled} />;
}
