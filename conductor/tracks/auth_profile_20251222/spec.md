# Track Specification: Authentication & User Profile

## Overview
This track implements a complete authentication system and user profile management for Bodh using **Auth.js (NextAuth.js) v5**. It includes pages for Login, Signup, and User Profile, along with the Logout functionality. The goal is to allow users to create accounts, secure them with email/password, manage their personal information, and track their educational progress.

## Functional Requirements

### Authentication
- **Signup Page:**
  - Users must provide Email, Password, Confirm Password, and Full Name.
  - Form validation for email format, password strength, and password matching.
  - Successful signup creates a new `User` record in the database.
  - Redirect to the Dashboard or Login page upon success.
- **Login Page:**
  - Users authenticate using Email and Password via Auth.js Credentials provider.
  - Form validation for empty fields.
  - Redirect to the Dashboard upon successful login.
- **Logout:**
  - Securely terminates the user session using Auth.js `signOut`.
  - Redirects the user to the **Login Page** immediately after logout.
- **Route Protection:**
  - Use Next.js Middleware with Auth.js to protect routes.
  - Unauthenticated users attempting to access protected pages (e.g., Dashboard, Profile, Course content) must be automatically redirected to the **Login Page**.

### User Profile
- **Profile Page:**
  - Displays user's Full Name, Email, and Avatar (if implemented, defaulting to a placeholder if not).
  - Displays a list or link to Enrolled Courses/Learning Progress.
- **Profile Actions:**
  - **Edit Profile:** Users can update their Full Name.
  - **Change Password:** Users can update their password (requiring current password for verification).
  - **Delete Account:** Users can permanently delete their account (with a confirmation modal).

## Technical Constraints & Requirements
- **Framework:** Next.js (App Router)
- **Authentication Library:** [Auth.js (NextAuth.js) v5](https://authjs.dev/getting-started/installation?framework=Next.js)
- **Database:** Prisma with PostgreSQL
- **Form Handling:** React Hook Form + Zod

## Acceptance Criteria
- [ ] User can sign up with valid credentials and is persisted in the DB.
- [ ] User cannot sign up with an existing email or mismatched passwords.
- [ ] User can log in with valid credentials and access protected routes via Auth.js.
- [ ] User cannot log in with invalid credentials and sees appropriate error messages.
- [ ] User can log out and is redirected to the Login page.
- [ ] Unauthenticated users are redirected to Login when accessing protected routes (Middleware check).
- [ ] User can view their profile details correctly.
- [ ] User can update their Full Name.
- [ ] User can change their password successfully.
- [ ] User can delete their account, removing their data from the DB.
- [ ] User can view their enrolled courses from the profile.

## Out of Scope
- Social Login (Google, GitHub, etc.)
- Magic Link authentication
- Two-Factor Authentication (2FA)
- Forgot Password / Password Reset via Email (separate track)
