"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { changePassword } from "@/actions/auth";

export function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formDataObj = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.append(key, value);
    });

    try {
      const result = await changePassword(formDataObj);

      if (!result.success) {
        setMessage({
          type: "error",
          text:
            result.error ||
            result.errors?.currentPassword?.[0] ||
            result.errors?.newPassword?.[0] ||
            result.errors?.confirmPassword?.[0] ||
            "Failed to change password",
        });
        setIsLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Password changed successfully" });
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${
            message.type === "success"
              ? "border border-green-200 bg-green-50 text-green-600"
              : "border border-red-200 bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="relative">
        <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white"
          name="currentPassword"
          onChange={handleChange}
          placeholder="Current password"
          required
          type="password"
          value={formData.currentPassword}
        />
      </div>

      <div className="relative">
        <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white"
          name="newPassword"
          onChange={handleChange}
          placeholder="New password"
          required
          type="password"
          value={formData.newPassword}
        />
      </div>

      <div className="relative">
        <Lock className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white"
          name="confirmPassword"
          onChange={handleChange}
          placeholder="Confirm new password"
          required
          type="password"
          value={formData.confirmPassword}
        />
      </div>

      <button
        className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-xl disabled:opacity-50"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}
