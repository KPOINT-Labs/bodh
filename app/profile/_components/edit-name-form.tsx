"use client";

import { User } from "lucide-react";
import { useState } from "react";
import { updateProfile } from "@/actions/auth";

interface EditNameFormProps {
  currentName: string;
}

export function EditNameForm({ currentName }: EditNameFormProps) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("name", name);

    try {
      const result = await updateProfile(formData);

      if (!result.success) {
        setMessage({
          type: "error",
          text:
            result.error || result.errors?.name?.[0] || "Failed to update name",
        });
        setIsLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Name updated successfully" });
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
        <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 py-3 pr-4 pl-12 text-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-violet-400 focus:bg-white"
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          type="text"
          value={name}
        />
      </div>

      <button
        className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-medium text-white shadow-lg transition-all hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-xl disabled:opacity-50"
        disabled={isLoading || name === currentName}
        type="submit"
      >
        {isLoading ? "Saving..." : "Update Name"}
      </button>
    </form>
  );
}
