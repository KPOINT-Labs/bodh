"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
        onClick={() => setShowConfirm(true)}
        className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Delete Account
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Are you sure you want to delete your account? This action cannot be undone.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all disabled:opacity-50"
        >
          {isLoading ? "Deleting..." : "Yes, Delete My Account"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isLoading}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
