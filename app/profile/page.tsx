import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { User, Mail, Calendar, BookOpen } from "lucide-react";
import { EditNameForm } from "./_components/edit-name-form";
import { ChangePasswordForm } from "./_components/change-password-form";
import { DeleteAccountButton } from "./_components/delete-account-button";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrollments: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-lg">
          <User className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-medium text-gray-900">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      {user.enrollments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Enrolled Courses</h2>

          <div className="space-y-3">
            {user.enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
              >
                <BookOpen className="w-5 h-5 text-violet-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {enrollment.course.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    Enrolled on{" "}
                    {new Date(enrollment.enrolledAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Name */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
        <EditNameForm currentName={user.name} />
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        <ChangePasswordForm />
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4 border border-red-200">
        <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
        <p className="text-sm text-gray-500">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
