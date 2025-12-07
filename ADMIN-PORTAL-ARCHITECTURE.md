# Admin Portal - Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BRIGHTMINDS TEACHER HUB                             │
│                         with Integrated Admin Portal                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            AUTHENTICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────────────────────────────┐         │
│  │    Auth0     │         │  Auth0 Action (Post-Login)          │         │
│  │              │ ───────▶│  - Extract app_metadata.role         │         │
│  │  User Login  │         │  - Default to 'teacher'              │         │
│  │              │         │  - Add claim: https://brightminds/role│         │
│  └──────────────┘         └──────────────────────────────────────┘         │
│         │                                    │                               │
│         └────────────────────────────────────┘                               │
│                           │                                                  │
│                           ▼                                                  │
│                  ┌─────────────────┐                                        │
│                  │  ID Token       │                                        │
│                  │  + role claim   │                                        │
│                  └─────────────────┘                                        │
│                           │                                                  │
└───────────────────────────┼──────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REACT APPLICATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  AuthContext (src/context/AuthContext.tsx)                          │  │
│  │  - Extracts role from token: user['https://brightminds/role']       │  │
│  │  - Merges with user profile: user.role = 'admin' | 'teacher'        │  │
│  │  - Provides role to all components                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                            │                                                 │
│                            ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  App.tsx - Route Configuration                                       │  │
│  │                                                                       │  │
│  │  PUBLIC ROUTES:                                                      │  │
│  │  ├─ /                    → LoginPage                                │  │
│  │  ├─ /not-authorized      → NotAuthorized (Access Denied)            │  │
│  │  └─ /student-portal      → StudentPortalPage                        │  │
│  │                                                                       │  │
│  │  PROTECTED ROUTES (ProtectedRoute - Any authenticated user):        │  │
│  │  ├─ /dashboard           → TeacherHome + AnnouncementBanner         │  │
│  │  ├─ /students            → StudentsPage                             │  │
│  │  ├─ /rooms               → RoomsPage                                │  │
│  │  ├─ /assignments         → AssignmentsPage                          │  │
│  │  ├─ /question-papers     → QuestionPapersPage                       │  │
│  │  └─ /profile             → ProfilePage                              │  │
│  │                                                                       │  │
│  │  ADMIN ROUTES (AdminRoute - Admin only):                            │  │
│  │  └─ /admin                                                           │  │
│  │     ├─ AdminLayout (Sidebar wrapper)                                │  │
│  │     │  ├─ /teachers      → AdminTeachers (default)                  │  │
│  │     │  ├─ /newsletters   → AdminNewsletters                         │  │
│  │     │  └─ /settings      → Coming Soon (placeholder)                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROUTE PROTECTION LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐              ┌──────────────────────┐              │
│  │  ProtectedRoute    │              │   AdminRoute         │              │
│  │                    │              │                      │              │
│  │  ✓ isAuthenticated?│              │  ✓ isAuthenticated?  │              │
│  │  ✓ has user?       │              │  ✓ user.role='admin'?│              │
│  │                    │              │                      │              │
│  │  ❌ → redirect: /  │              │  ❌ → /not-authorized│              │
│  │  ✅ → render child │              │  ✅ → render child   │              │
│  └────────────────────┘              └──────────────────────┘              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEACHER DASHBOARD                        ADMIN PORTAL                      │
│  ┌─────────────────────────┐             ┌────────────────────────────┐    │
│  │ TeacherHome.tsx         │             │ AdminLayout.tsx            │    │
│  │ ┌─────────────────────┐ │             │ ┌────────────────────────┐ │    │
│  │ │ AnnouncementBanner  │ │             │ │ Sidebar Navigation:    │ │    │
│  │ │ - Fetch active      │ │             │ │  - Teachers            │ │    │
│  │ │ - Display banner    │ │             │ │  - Announcements       │ │    │
│  │ │ - Dismissible       │ │             │ │  - Settings (Soon)     │ │    │
│  │ └─────────────────────┘ │             │ └────────────────────────┘ │    │
│  │                         │             │                            │    │
│  │ - Grade filters         │             │ <Outlet />                 │    │
│  │ - Quick actions         │             │   │                        │    │
│  │ - Stats cards           │             │   ├─ AdminTeachers        │    │
│  │ - Recent rooms          │             │   │   - List teachers      │    │
│  │ - Assignments           │             │   │   - Activate/Deactivate│    │
│  │ - Help requests         │             │   │   - Reset password     │    │
│  └─────────────────────────┘             │   │                        │    │
│                                           │   └─ AdminNewsletters      │    │
│                                           │       - Create announcements│   │
│                                           │       - Toggle active       │    │
│                                           │       - View list           │    │
│                                           └────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SUPABASE EDGE FUNCTIONS:                                                   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  /functions/v1/admin-teachers                                        │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  GET  /admin-teachers                                          │  │  │
│  │  │  - Verify admin role                                           │  │  │
│  │  │  - Filter by school_id                                         │  │  │
│  │  │  - Return teacher list                                         │  │  │
│  │  │                                                                 │  │  │
│  │  │  POST /admin-teachers/:id/activate                             │  │  │
│  │  │  - Verify admin role                                           │  │  │
│  │  │  - Update is_active = true                                     │  │  │
│  │  │                                                                 │  │  │
│  │  │  POST /admin-teachers/:id/deactivate                           │  │  │
│  │  │  - Verify admin role                                           │  │  │
│  │  │  - Update is_active = false                                    │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  /functions/v1/admin-reset-password                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  POST /admin-reset-password                                    │  │  │
│  │  │  - Verify admin role                                           │  │  │
│  │  │  - Verify teacher in same school                              │  │  │
│  │  │  - Send password reset email (Auth0/Supabase)                 │  │  │
│  │  │  - Return success message                                      │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER (SUPABASE)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  profiles TABLE                                                    │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │  id              uuid       PRIMARY KEY                       │  │    │
│  │  │  auth0_user_id   text       NOT NULL                          │  │    │
│  │  │  full_name       text                                         │  │    │
│  │  │  email           text                                         │  │    │
│  │  │  school_name     text                                         │  │    │
│  │  │  school_id       uuid       [NEW - Multi-school support]     │  │    │
│  │  │  role            text       [NEW - 'admin' | 'teacher']       │  │    │
│  │  │  is_active       boolean    [NEW - Account status]            │  │    │
│  │  │  grades_taught   text[]                                       │  │    │
│  │  │  subjects        text[]                                       │  │    │
│  │  │  created_at      timestamptz                                  │  │    │
│  │  │  updated_at      timestamptz                                  │  │    │
│  │  │                                                                │  │    │
│  │  │  INDEXES:                                                      │  │    │
│  │  │  - idx_profiles_role        ON (role)                         │  │    │
│  │  │  - idx_profiles_school_id   ON (school_id)                    │  │    │
│  │  │  - idx_profiles_is_active   ON (is_active)                    │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  announcements TABLE [NEW]                                         │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │  id              uuid       PRIMARY KEY                       │  │    │
│  │  │  school_id       uuid       NOT NULL                          │  │    │
│  │  │  title           text       NOT NULL                          │  │    │
│  │  │  body            text       NOT NULL                          │  │    │
│  │  │  type            text       DEFAULT 'banner'                  │  │    │
│  │  │  audience        text       DEFAULT 'all'                     │  │    │
│  │  │  start_at        timestamptz DEFAULT now()                    │  │    │
│  │  │  end_at          timestamptz NULL                             │  │    │
│  │  │  is_active       boolean    DEFAULT true                      │  │    │
│  │  │  created_by      uuid       NOT NULL                          │  │    │
│  │  │  created_at      timestamptz DEFAULT now()                    │  │    │
│  │  │  updated_at      timestamptz DEFAULT now()                    │  │    │
│  │  │                                                                │  │    │
│  │  │  INDEXES:                                                      │  │    │
│  │  │  - idx_announcements_school_id      ON (school_id)            │  │    │
│  │  │  - idx_announcements_is_active      ON (is_active)            │  │    │
│  │  │  - idx_announcements_audience       ON (audience)             │  │    │
│  │  │  - idx_announcements_composite      ON (school_id, is_active, │  │    │
│  │  │                                          audience, start_at)   │  │    │
│  │  │                                                                │  │    │
│  │  │  RLS POLICIES:                                                 │  │    │
│  │  │  - announcements_admin_all:                                   │  │    │
│  │  │    Admins can CRUD announcements in their school              │  │    │
│  │  │  - announcements_read_active:                                 │  │    │
│  │  │    Teachers/students can read active announcements            │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW EXAMPLES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO 1: Admin Views Teachers                                           │
│  ───────────────────────────────────────────────────────────────────        │
│  1. Admin navigates to /admin/teachers                                      │
│  2. AdminRoute checks: user.role === 'admin' ✓                              │
│  3. AdminTeachers.tsx fetches teachers                                      │
│  4. Query: profiles WHERE role='teacher' AND school_id=admin.school_id      │
│  5. Display teacher list with activate/deactivate buttons                   │
│                                                                              │
│  SCENARIO 2: Admin Creates Announcement                                     │
│  ──────────────────────────────────────────────────────────────────         │
│  1. Admin navigates to /admin/newsletters                                   │
│  2. Clicks "New Announcement"                                               │
│  3. Fills form: title, body                                                 │
│  4. Submits form                                                            │
│  5. Insert into announcements (school_id=admin.school_id, created_by=admin) │
│  6. RLS policy checks: user.role='admin' AND school_id matches ✓            │
│  7. Success toast shown                                                     │
│                                                                              │
│  SCENARIO 3: Teacher Views Announcement                                     │
│  ──────────────────────────────────────────────────────────────────         │
│  1. Teacher navigates to /dashboard                                         │
│  2. AnnouncementBanner component mounts                                     │
│  3. Query: announcements WHERE school_id=teacher.school_id                  │
│  4.        AND is_active=true AND audience IN ('all','teachers')            │
│  5.        AND start_at <= now() AND (end_at IS NULL OR end_at >= now())    │
│  6. RLS policy checks: user is teacher, announcement is active ✓            │
│  7. Display banner with dismiss button                                      │
│  8. Dismissed state saved to localStorage                                   │
│                                                                              │
│  SCENARIO 4: Teacher Tries to Access Admin Portal                           │
│  ───────────────────────────────────────────────────────────────────        │
│  1. Teacher navigates to /admin                                             │
│  2. AdminRoute checks: user.role === 'admin' ✗                              │
│  3. Redirect to /not-authorized                                             │
│  4. Display "Access Denied" message                                         │
│  5. Show "Go to Dashboard" button                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYERS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Layer 1: Auth0 Authentication                                              │
│  ├─ User must be logged in                                                  │
│  └─ Valid JWT token required                                                │
│                                                                              │
│  Layer 2: Frontend Route Protection                                         │
│  ├─ ProtectedRoute: Authenticated users only                                │
│  └─ AdminRoute: Admin role required                                         │
│                                                                              │
│  Layer 3: Backend Role Verification                                         │
│  ├─ Edge functions verify user.role                                         │
│  └─ Reject if not admin                                                     │
│                                                                              │
│  Layer 4: Database Row Level Security (RLS)                                 │
│  ├─ Profiles: No RLS (handled by backend)                                   │
│  └─ Announcements: RLS policies enforce school_id scoping                   │
│                                                                              │
│  Layer 5: School Data Isolation                                             │
│  ├─ All queries filter by school_id                                         │
│  ├─ Admins cannot see other schools' data                                   │
│  └─ Teachers cannot see other schools' data                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Architecture Principles

### 1. **Role-Based Access Control (RBAC)**
- Roles defined in Auth0 `app_metadata`
- Extracted via Auth0 Action and added to token as custom claim
- Frontend components check role before rendering
- Backend functions verify role before processing

### 2. **School Data Isolation**
- Every query filters by `school_id`
- Admins can only manage teachers/announcements in their school
- Cross-school access is prevented at database level

### 3. **Defense in Depth**
- Multiple security layers from Auth0 to database
- Each layer independently verifies authorization
- Fail-safe: if one layer fails, others still protect

### 4. **Separation of Concerns**
- Authentication: Auth0
- Authorization: Role claims + RLS
- Data Layer: Supabase with RLS
- Presentation: React components
- Business Logic: Edge functions

### 5. **Scalability**
- Indexed database columns for fast queries
- Stateless edge functions
- Client-side caching (localStorage for dismissed announcements)
- Efficient React rendering with proper state management

---

**Architecture Version:** 1.0.0  
**Last Updated:** December 6, 2025
