import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
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
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
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
                Admin panel
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl w-full mx-auto flex">
        {/* Sidebar nav */}
        <nav className="w-48 flex-shrink-0 border-r border-stone-200 py-6 pr-4">
          <div className="space-y-1">
            <SideLink to="/admin" end>Dashboard</SideLink>
            <SideLink to="/admin/schools">Schools</SideLink>
            <SideLink to="/admin/users">Users</SideLink>
            <SideLink to="/admin/classes">Classes</SideLink>
            <SideLink to="/admin/courses">Courses</SideLink>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideLink({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `block px-3 py-2 rounded-lg text-sm font-medium transition ${
          isActive
            ? "bg-stone-100 text-stone-900"
            : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
        }`
      }
    >
      {children}
    </NavLink>
  );
}
