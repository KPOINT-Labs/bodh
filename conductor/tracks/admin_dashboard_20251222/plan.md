# Track Plan: Create Admin Dashboard for Course Management

## Phase 1: Foundation & Database Schema [checkpoint: c229c96]
- [x] Task: Update Prisma Schema for Course, Module, and Lesson models [db push]
    - [x] Subtask: Define `Course` model (id, title, description, imageUrl, price, isPublished, etc.)
    - [x] Subtask: Define `Module` model (id, title, courseId, position, isPublished)
    - [x] Subtask: Define `Lesson` model (id, title, moduleId, videoUrl, position, isPublished, etc.)
    - [x] Subtask: Create and run database migration (Executed `db push` due to permissions)
- [x] Task: Conductor - User Manual Verification 'Foundation & Database Schema' (Protocol in workflow.md) c229c96

## Phase 2: Admin Layout & Course Management
- [x] Task: Create Admin Layout 5b80cd6
    - [x] Subtask: Create `app/(dashboard)/layout.tsx` for admin-specific structure
    - [x] Subtask: Create `app/(dashboard)/_components/sidebar.tsx` with navigation links
- [x] Task: Implement Course List Page 4f54db0
    - [x] Subtask: Write tests for fetching and displaying courses
    - [x] Subtask: Create `app/(dashboard)/(routes)/teacher/courses/page.tsx` with a data table (shadcn)
- [x] Task: Implement Course Creation f077015
    - [x] Subtask: Write tests for course creation logic
    - [x] Subtask: Create `app/(dashboard)/(routes)/teacher/create/page.tsx` with a form (react-hook-form + zod)
    - [x] Subtask: Implement Server Action for creating a course
- [x] Task: Implement Course Editing (Details & Resources)
    - [x] Subtask: Write tests for course update logic
    - [x] Subtask: Create `app/(dashboard)/(routes)/teacher/courses/[courseId]/page.tsx`
    - [x] Subtask: Implement Title, Description, Image, Price, and Category forms
    - [x] Subtask: Implement Attachment upload form
- [ ] Task: Conductor - User Manual Verification 'Admin Layout & Course Management' (Protocol in workflow.md)

## Phase 3: Module & Lesson Management
- [ ] Task: Implement Module Management
    - [ ] Subtask: Write tests for module CRUD operations
    - [ ] Subtask: Create Module List component within the Course Edit page
    - [ ] Subtask: Implement Module creation/reordering/publishing logic
- [ ] Task: Implement Lesson Management
    - [ ] Subtask: Write tests for lesson CRUD operations
    - [ ] Subtask: Create Lesson List component within Module view (or nested)
    - [ ] Subtask: Implement Lesson creation/reordering/publishing logic
- [ ] Task: Conductor - User Manual Verification 'Module & Lesson Management' (Protocol in workflow.md)
