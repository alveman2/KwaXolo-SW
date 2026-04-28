import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import App from "./App";

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!["student", "teacher"].includes(user.role)) {
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

  if (user && ["student", "teacher"].includes(user.role)) {
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

      {/* Unified shell for both students and teachers */}
      <Route path="/app" element={
        <RequireAuth>
          <App />
        </RequireAuth>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
