"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { changePassword } from "@/actions/auth";

export function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setMessage({ type: "error", text: "Something went wrong" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="password"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          placeholder="Current password"
          required
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-violet-400 outline-none transition-all"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="password"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="New password"
          required
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-violet-400 outline-none transition-all"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm new password"
          required
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-violet-400 outline-none transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        {isLoading ? "Changing..." : "Change Password"}
      </button>
    </form>
  );
}
