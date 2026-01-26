"use client";

import { BookOpen, Lock, Mail, Ticket, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { signup } from "@/actions/auth";

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    inviteCode: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setFieldErrors({});

    const formDataObj = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.append(key, value);
    });

    try {
      const result = await signup(formDataObj);

      if (!result.success) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else if (result.error) {
          setError(result.error);
        }
        setIsLoading(false);
        return;
      }

      // Redirect to login page on success
      router.push("/login?registered=true");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    signIn("google", { callbackUrl: "/courses" });
  };

  return (
    <div className="relative w-full max-w-md animate-scale-in rounded-3xl bg-white p-8 shadow-2xl">
      {/* Icon */}
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
          <BookOpen className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Heading */}
      <h1 className="mb-2 text-center font-semibold text-2xl text-gray-900">
        Create Account
      </h1>
      <p className="mb-6 text-center text-gray-500">
        Start your learning journey today
      </p>

      {/* Beta Notice */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-center font-medium text-amber-800 text-sm">
          Beta Access - KPOINT Employees Only
        </p>
        <p className="mt-1 text-center text-amber-600 text-xs">
          Need access? Contact KPOINT support
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Google Sign Up - @kpoint.com only */}
      <button
        className="mb-2 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
        disabled={isLoading}
        onClick={handleGoogleSignup}
      >
        <svg
          fill="none"
          height="20"
          viewBox="0 0 20 20"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.8 10.2273C19.8 9.51819 19.7364 8.83637 19.6182 8.18182H10V12.05H15.4818C15.2273 13.3 14.4727 14.3591 13.3636 15.0682V17.5773H16.7182C18.7091 15.7364 19.8 13.2273 19.8 10.2273Z"
            fill="#4285F4"
          />
          <path
            d="M10 20C12.7 20 14.9636 19.1045 16.7182 17.5773L13.3636 15.0682C12.4273 15.6682 11.2545 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.1636 4.38636 11.7273H0.931818V14.3182C2.67727 17.7909 6.09091 20 10 20Z"
            fill="#34A853"
          />
          <path
            d="M4.38636 11.7273C4.16364 11.1273 4.04545 10.4773 4.04545 9.81818C4.04545 9.15909 4.16364 8.50909 4.38636 7.90909V5.31818H0.931818C0.268182 6.63636 0 8.18182 0 9.81818C0 11.4545 0.268182 13 0.931818 14.3182L4.38636 11.7273Z"
            fill="#FBBC05"
          />
          <path
            d="M10 3.61364C11.3818 3.61364 12.6182 4.10909 13.5818 5.02727L16.5364 2.07273C14.9545 0.590909 12.6909 -0.181818 10 -0.181818C6.09091 -0.181818 2.67727 2.02727 0.931818 5.5L4.38636 8.09091C5.19091 5.65455 7.39545 3.61364 10 3.61364Z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-gray-500 text-sm uppercase tracking-wide">
          Or with invite code
        </span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Signup Form */}
      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Invite Code Input */}
        <div className="relative">
          <Ticket className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className={`w-full rounded-xl border-2 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white ${
              fieldErrors.inviteCode ? "border-red-400" : "border-gray-200"
            }`}
            inputMode="numeric"
            maxLength={6}
            name="inviteCode"
            onChange={handleChange}
            pattern="\d{6}"
            placeholder="Invite code (6 digits)"
            required
            type="text"
            value={formData.inviteCode}
          />
          {fieldErrors.inviteCode && (
            <p className="mt-1 text-red-500 text-xs">
              {fieldErrors.inviteCode[0]}
            </p>
          )}
        </div>

        {/* Name Input */}
        <div className="relative">
          <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className={`w-full rounded-xl border-2 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white ${
              fieldErrors.name ? "border-red-400" : "border-gray-200"
            }`}
            name="name"
            onChange={handleChange}
            placeholder="Full name"
            required
            type="text"
            value={formData.name}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-red-500 text-xs">{fieldErrors.name[0]}</p>
          )}
        </div>

        {/* Email Input */}
        <div className="relative">
          <Mail className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className={`w-full rounded-xl border-2 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white ${
              fieldErrors.email ? "border-red-400" : "border-gray-200"
            }`}
            name="email"
            onChange={handleChange}
            placeholder="Email address"
            required
            type="email"
            value={formData.email}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-red-500 text-xs">{fieldErrors.email[0]}</p>
          )}
        </div>

        {/* Password Input */}
        <div className="relative">
          <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className={`w-full rounded-xl border-2 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white ${
              fieldErrors.password ? "border-red-400" : "border-gray-200"
            }`}
            name="password"
            onChange={handleChange}
            placeholder="Password"
            required
            type="password"
            value={formData.password}
          />
          {fieldErrors.password && (
            <p className="mt-1 text-red-500 text-xs">
              {fieldErrors.password[0]}
            </p>
          )}
        </div>

        {/* Confirm Password Input */}
        <div className="relative">
          <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            className={`w-full rounded-xl border-2 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white ${
              fieldErrors.confirmPassword ? "border-red-400" : "border-gray-200"
            }`}
            name="confirmPassword"
            onChange={handleChange}
            placeholder="Confirm password"
            required
            type="password"
            value={formData.confirmPassword}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-red-500 text-xs">
              {fieldErrors.confirmPassword[0]}
            </p>
          )}
        </div>

        {/* Sign Up Button */}
        <button
          className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-xl disabled:opacity-50"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      {/* Sign In Link */}
      <div className="mt-6 text-center">
        <p className="text-gray-500 text-sm">
          Already have an account?{" "}
          <Link
            className="font-medium text-violet-600 hover:text-violet-700"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
