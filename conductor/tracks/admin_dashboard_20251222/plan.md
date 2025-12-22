# Track Plan: Create Admin Dashboard for Course Management

## Phase 1: Foundation & Database Schema
- [ ] Task: Update Prisma Schema for Course, Module, and Lesson models
    - [ ] Subtask: Define `Course` model (id, title, description, imageUrl, price, isPublished, etc.)
    - [ ] Subtask: Define `Module` model (id, title, courseId, position, isPublished)
    - [ ] Subtask: Define `Lesson` model (id, title, moduleId, videoUrl, position, isPublished, etc.)
    - [ ] Subtask: Create and run database migration
- [ ] Task: Conductor - User Manual Verification 'Foundation & Database Schema' (Protocol in workflow.md)

## Phase 2: Admin Layout & Course Management
- [ ] Task: Create Admin Layout
    - [ ] Subtask: Create `app/(dashboard)/layout.tsx` for admin-specific structure
    - [ ] Subtask: Create `app/(dashboard)/_components/sidebar.tsx` with navigation links
- [ ] Task: Implement Course List Page
    - [ ] Subtask: Write tests for fetching and displaying courses
    - [ ] Subtask: Create `app/(dashboard)/(routes)/teacher/courses/page.tsx` with a data table (shadcn)
- [ ] Task: Implement Course Creation
    - [ ] Subtask: Write tests for course creation logic
    - [ ] Subtask: Create `app/(dashboard)/(routes)/teacher/create/page.tsx` with a form (react-hook-form + zod)
    - [ ] Subtask: Implement Server Action for creating a course
- [ ] Task: Implement Course Editing (Basic Details)
    - [ ] Subtask: Write tests for course update logic
    - [ ] Subtask: Create `app/(dashboard)/(routes)/teacher/courses/[courseId]/page.tsx`
    - [ ] Subtask: Implement Title and Description forms
- [ ] Task: Conductor - User Manual Verification 'Admin Layout & Course Management' (Protocol in workflow.md)

## Phase 3: Module & Lesson Management
- [ ] Task: Implement Module Management
    - [ ] Subtask: Write tests for module CRUD operations
    - [ ] Subtask: Create Module List component within the Course Edit page
    - [ ] Subtask: Implement Module creation/reordering logic
- [ ] Task: Implement Lesson Management
    - [ ] Subtask: Write tests for lesson CRUD operations
    - [ ] Subtask: Create Lesson List component within Module view (or nested)
    - [ ] Subtask: Implement Lesson creation/reordering logic
- [ ] Task: Conductor - User Manual Verification 'Module & Lesson Management' (Protocol in workflow.md)
