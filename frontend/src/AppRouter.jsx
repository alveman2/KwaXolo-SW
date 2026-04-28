import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import App from "./App";
import StudentLayout from "./pages/student/StudentLayout";
import FeedPage from "./pages/student/FeedPage";
import ProgressPage from "./pages/student/ProgressPage";
import JoinPage from "./pages/student/JoinPage";
import StudentCourseView from "./pages/student/StudentCourseView";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import SchoolsPage from "./pages/admin/SchoolsPage";
import UsersPage from "./pages/admin/UsersPage";
import ClassesPage from "./pages/admin/ClassesPage";
import CoursesPage from "./pages/admin/CoursesPage";

function RequireAuth({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (user) {
    switch (user.role) {
      case "admin": return <Navigate to="/admin" replace />;
      case "teacher": return <Navigate to="/teacher" replace />;
      default: return <Navigate to="/app" replace />;
    }
  }

  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public / guest routes */}
      <Route path="/" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

      {/* Student routes */}
      <Route path="/app" element={
        <RequireAuth allowedRoles={["student"]}>
          <StudentLayout />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/app/feed" replace />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="join" element={<JoinPage />} />
        <Route path="course/:courseId" element={<StudentCourseView />} />
      </Route>

      {/* Teacher routes — existing app wrapped */}
      <Route path="/teacher/*" element={
        <RequireAuth allowedRoles={["teacher"]}>
          <App />
        </RequireAuth>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <RequireAuth allowedRoles={["admin"]}>
          <AdminLayout />
        </RequireAuth>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="courses" element={<CoursesPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
