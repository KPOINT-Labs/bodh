import { BookOpen, Calendar, Mail, User } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "./_components/change-password-form";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { EditNameForm } from "./_components/edit-name-form";

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
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
          <User className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-2xl text-gray-900">{user.name}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>

      {/* User Info Card */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="font-semibold text-gray-900 text-lg">
          Account Information
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-500 text-sm">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-500 text-sm">Member Since</p>
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
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="font-semibold text-gray-900 text-lg">
            Enrolled Courses
          </h2>

          <div className="space-y-3">
            {user.enrollments.map((enrollment) => (
              <div
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-4"
                key={enrollment.id}
              >
                <BookOpen className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {enrollment.course.title}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Enrolled on{" "}
                    {new Date(enrollment.enrolledAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Name */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="font-semibold text-gray-900 text-lg">Edit Profile</h2>
        <EditNameForm currentName={user.name} />
      </div>

      {/* Change Password */}
      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="font-semibold text-gray-900 text-lg">Change Password</h2>
        <ChangePasswordForm />
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 rounded-2xl border border-red-200 bg-white p-6 shadow-lg">
        <h2 className="font-semibold text-lg text-red-600">Danger Zone</h2>
        <p className="text-gray-500 text-sm">
          Once you delete your account, there is no going back. Please be
          certain.
        </p>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
