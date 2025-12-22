# Track Specification: Create Admin Dashboard for Course Management

## Overview
This track focuses on building the administrative interface for Bodh, enabling authorized users (admins/instructors) to create and manage the educational content structure. This includes setting up courses, modules, and lessons.

## Goals
- Create a secure admin layout and navigation.
- Implement CRUD operations for Courses (including price, category, and attachments).
- Implement CRUD operations for Modules within a Course.
- Implement CRUD operations for Lessons within a Module.
- Ensure the database schema supports this hierarchy.

## User Stories
- As an admin, I want to view a list of all courses so I can manage them.
- As an admin, I want to create a new course with a title, description, thumbnail, price, and category.
- As an admin, I want to upload attachments (resources) for a course.
- As an admin, I want to add modules to a course to organize the curriculum.
- As an admin, I want to add lessons (video/text) to a module.
- As an admin, I want to edit, delete, or publish/unpublish courses, modules, and lessons.

## Technical Requirements
- **Frontend:** Next.js (App Router), Shadcn UI, Tailwind CSS.
- **Backend:** Next.js Server Actions / API Routes.
- **Database:** Prisma ORM with PostgreSQL.
- **Validation:** Zod for form validation.
- **Storage:** UploadThing (or similar) for file uploads (attachments/thumbnails).
