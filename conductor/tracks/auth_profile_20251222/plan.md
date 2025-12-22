# Track Plan: Authentication & User Profile

## Phase 1: Auth.js Setup & Foundation
- [x] Task: Install Auth.js and dependencies (next-auth@beta, bcryptjs) db452a8
- [ ] Task: Configure Auth.js (auth.ts) with Prisma Adapter and Credentials Provider
- [ ] Task: Set up Next.js Middleware for route protection
- [ ] Task: Create Auth API route handler (app/api/auth/[...nextauth]/route.ts)
- [ ] Task: Conductor - User Manual Verification 'Auth.js Setup & Foundation' (Protocol in workflow.md)

## Phase 2: Signup Implementation
- [ ] Task: Write tests for signup server action
- [ ] Task: Implement signup server action (with password hashing)
- [ ] Task: Write tests for Signup Page UI
- [ ] Task: Implement Signup Page (app/signup/page.tsx) with validation
- [ ] Task: Conductor - User Manual Verification 'Signup Implementation' (Protocol in workflow.md)

## Phase 3: Login & Session Management
- [ ] Task: Write tests for login functionality
- [ ] Task: Implement login logic within Credentials Provider
- [ ] Task: Write tests for Login Page UI
- [ ] Task: Implement Login Page (app/login/page.tsx)
- [ ] Task: Conductor - User Manual Verification 'Login & Session Management' (Protocol in workflow.md)

## Phase 4: User Profile & Account Management
- [ ] Task: Write tests for Profile Page and data fetching
- [ ] Task: Implement Profile Page (app/profile/page.tsx)
- [ ] Task: Write tests for account management actions (Update Name, Change Password, Delete Account)
- [ ] Task: Implement Edit Profile functionality (Server Action + UI)
- [ ] Task: Implement Change Password functionality (Server Action + UI)
- [ ] Task: Implement Delete Account functionality (Server Action + UI)
- [ ] Task: Conductor - User Manual Verification 'User Profile & Account Management' (Protocol in workflow.md)

## Phase 5: Logout & Navigation Integration
- [ ] Task: Write tests for logout behavior
- [ ] Task: Implement Logout functionality and navigation links
- [ ] Task: Update Sidebar/Navbar to reflect auth state (Login/Signup vs Logout/Profile)
- [ ] Task: Conductor - User Manual Verification 'Logout & Navigation Integration' (Protocol in workflow.md)
