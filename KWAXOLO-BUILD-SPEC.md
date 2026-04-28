# KwaXolo Bridge — Build Specification: Auth, Roles & Admin

> Feed this file to Claude Code as context. We are ONLY adding authentication, role-based access, and an admin panel to the existing KwaXolo-SW app. All existing design, colors, components, and functionality stay exactly as they are.

---

## 1. WHAT EXISTS — DO NOT CHANGE

The repo has a working app with its own design language. **Keep everything as-is:**

- **All existing components**: LandingScreen, ObservationScreen, OpportunityScreen, CoursesScreen, CourseDetailScreen, TeacherScreen, PhoneMockup — untouched
- **All existing design**: colors, fonts, layout, Tailwind config, CSS — untouched
- **All existing API routes**: /api/opportunity, /api/refine, /api/teacher/generate-course, /api/courses — untouched
- **All existing database**: courses table, seed data — untouched
- **Stack**: React 18 + Vite + Tailwind (frontend), Express + SQLite (backend)
- **Colors** (already in tailwind.config.js): kwaxolo-green #0f7c4a, kwaxolo-gold #f4b53f, kwaxolo-red #d83731, kwaxolo-blue #1e3a8a, kwaxolo-cream #faf6ef
- **Design style**: white bg, stone borders, clean cards, stone-500 text — match this for all new pages

---

## 2. WHAT WE ARE ADDING

1. **Authentication** — login/register with email+password (bcrypt + JWT)
2. **Three roles** — student, teacher, admin — with role-based routing
3. **Admin panel** — manage schools, users, classes, courses

---

## 3. DATABASE SCHEMA (extend backend/db.js)

Add these tables alongside the existing courses table. Do NOT modify the courses table.

schools: id TEXT PK, name TEXT, code TEXT UNIQUE, created_at INTEGER
users: id TEXT PK, email TEXT UNIQUE, password_hash TEXT, display_name TEXT, role TEXT (student/teacher/admin), school_id TEXT FK, created_at INTEGER
classes: id TEXT PK, name TEXT, join_code TEXT UNIQUE, school_id TEXT FK, teacher_id TEXT FK, created_at INTEGER
class_members: id TEXT PK, class_id TEXT FK, user_id TEXT FK, joined_at INTEGER, UNIQUE(class_id, user_id)
class_courses: id TEXT PK, class_id TEXT FK, course_id TEXT FK, published_at INTEGER, UNIQUE(class_id, course_id)
progress: id TEXT PK, user_id TEXT FK, course_id TEXT FK, lesson_index INTEGER, completed_at INTEGER, UNIQUE(user_id, course_id, lesson_index)

### Seed Data
- 1 admin: admin@kwaxolo.org / admin123 / role admin
- 9 schools: KwaXolo Secondary, Margate High, Port Shepstone High, Gamalakhe High, Izingolweni High, Southport Secondary, Umzumbe High, Gcekeni Secondary, Weza High

---

## 4. BACKEND API ROUTES

### Auth (new file backend/auth.js)
- authenticateToken middleware: JWT from Authorization Bearer header
- requireRole(...roles) middleware
- JWT secret: process.env.JWT_SECRET || "kwaxolo-dev-secret", expiry 7 days

### Auth Routes
POST /api/auth/register { email, password, displayName } -> { token, user } (default role: student)
POST /api/auth/login { email, password } -> { token, user }
GET /api/auth/me (Bearer token) -> { user }

### Student Routes (role: student)
POST /api/classes/join { joinCode } -> class info
GET /api/my/feed -> courses from joined classes with progress
GET /api/my/classes -> joined classes
GET /api/my/progress -> progress records
POST /api/my/progress { courseId, lessonIndex } -> mark lesson done

### Teacher Routes (role: teacher)
GET /api/teacher/classes -> own classes
POST /api/teacher/classes { name, schoolId } -> create class (auto join code)
POST /api/teacher/classes/:classId/publish { courseId } -> publish course
GET /api/teacher/classes/:classId/students -> students + progress
DELETE /api/teacher/classes/:classId/courses/:courseId -> unpublish

### Admin Routes (role: admin)
GET/POST /api/admin/schools, PUT/DELETE /api/admin/schools/:id
GET /api/admin/users (?role=, ?schoolId=), PUT/DELETE /api/admin/users/:id
GET /api/admin/classes (?schoolId=)
GET /api/admin/stats -> { totalStudents, totalTeachers, totalSchools, totalClasses, totalCourses, totalCompletions }

---

## 5. FRONTEND CHANGES

Install: cd frontend && npm install react-router-dom

### Auth Context (src/context/AuthContext.jsx)
Token in localStorage, provides user/login/logout/register/loading, auto-attach Authorization header

### Routing
/ -> Login, /register -> Register
After login: student -> /app, teacher -> /teacher, admin -> /admin

Student: /app/feed, /app/progress, /app/join, /app/course/:id (bottom tab nav)
Teacher: /teacher (existing app + My Classes), /teacher/classes, /teacher/class/:id
Admin: /admin, /admin/schools, /admin/users, /admin/classes, /admin/courses

### Design Rules: Use EXACT same design as existing app. Same Tailwind classes, same colors, same style.

### Login/Register: Centered card, stone colors, kwaxolo-green buttons, matching existing header
### Student: Bottom tabs (Feed/Progress/Join), reuse CoursesScreen pattern, CourseDetailScreen with mark-complete
### Teacher: Existing app + class management in nav
### Admin: Stats dashboard, schools CRUD, users management, classes/courses overview

---

## 6. IMPLEMENTATION ORDER

Task 1: Backend DB + Auth (tables, seed, JWT middleware, auth routes)
Task 2: Backend role routes (student, teacher, admin endpoints)
Task 3: Frontend auth + routing (AuthContext, login/register, React Router)
Task 4: Frontend student views (feed, progress, join, course viewer)
Task 5: Frontend teacher additions (class management added to existing)
Task 6: Frontend admin panel (dashboard, schools, users, classes, courses)

---

## 7. TECHNICAL NOTES
- Join codes: XXXX-123 (4 uppercase letters + dash + 3 digits)
- Password min: 6 chars. All IDs: crypto.randomUUID()
- Do NOT change tailwind.config.js, existing components, or visual design
- New pages must look like they belong in the existing app
