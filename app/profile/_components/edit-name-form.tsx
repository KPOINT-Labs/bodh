"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { updateProfile } from "@/actions/auth";

interface EditNameFormProps {
  currentName: string;
}

export function EditNameForm({ currentName }: EditNameFormProps) {
  const [name, setName] = useState(currentName);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
          text: result.error || result.errors?.name?.[0] || "Failed to update name",
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
        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:bg-white focus:border-violet-400 outline-none transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || name === currentName}
        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        {isLoading ? "Saving..." : "Update Name"}
      </button>
    </form>
  );
}
