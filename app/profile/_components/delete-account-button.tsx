"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteAccount } from "@/actions/auth";

export function DeleteAccountButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await deleteAccount();

      if (!result.success) {
        setError(result.error || "Failed to delete account");
        setIsLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong");
      setIsLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-medium text-white transition-all hover:bg-red-700"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="h-4 w-4" />
        Delete Account
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-600 text-sm">
          {error}
        </div>
      )}

      <p className="text-gray-600 text-sm">
        Are you sure you want to delete your account? This action cannot be
        undone.
      </p>

      <div className="flex gap-3">
        <button
          className="rounded-xl bg-red-600 px-6 py-3 font-medium text-white transition-all hover:bg-red-700 disabled:opacity-50"
          disabled={isLoading}
          onClick={handleDelete}
        >
          {isLoading ? "Deleting..." : "Yes, Delete My Account"}
        </button>
        <button
          className="rounded-xl bg-gray-100 px-6 py-3 font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-50"
          disabled={isLoading}
          onClick={() => setShowConfirm(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
