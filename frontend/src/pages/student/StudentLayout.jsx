import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 grid grid-cols-2 gap-0.5">
              <div className="bg-kwaxolo-gold rounded-sm" />
              <div className="bg-kwaxolo-red rounded-sm" />
              <div className="bg-kwaxolo-blue rounded-sm" />
              <div className="bg-kwaxolo-green rounded-sm" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight text-stone-900">
                KwaXolo Bridge
              </div>
              <div className="text-xs text-stone-500 leading-tight">
                {user?.display_name}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Bottom tab nav */}
      <nav className="border-t border-stone-200 bg-white sticky bottom-0">
        <div className="max-w-3xl mx-auto flex">
          <TabLink to="/app/feed" icon={<FeedIcon />} label="Feed" />
          <TabLink to="/app/progress" icon={<ProgressIcon />} label="Progress" />
          <TabLink to="/app/join" icon={<JoinIcon />} label="Join" />
        </div>
      </nav>
    </div>
  );
}

function TabLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition ${
          isActive ? "text-kwaxolo-green" : "text-stone-400 hover:text-stone-600"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function FeedIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h12" strokeLinecap="round" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path d="M12 4v16m8-8H4" strokeLinecap="round" />
    </svg>
  );
}
