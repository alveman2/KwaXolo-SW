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
    if (user.role === "teacher") return <Navigate to="/teacher" replace />;
    return <Navigate to="/app" replace />;
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

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
