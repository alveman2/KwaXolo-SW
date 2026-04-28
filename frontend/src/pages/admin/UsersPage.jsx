import { useState, useEffect } from "react";
import { getUsers, updateUser, deleteUser, getSchools } from "../../lib/adminApi";

const ROLE_OPTIONS = ["student", "teacher", "admin"];
const ROLE_COLORS = {
  student: "bg-stone-100 text-stone-700",
  teacher: "bg-kwaxolo-gold/20 text-stone-700",
  admin: "bg-kwaxolo-green/10 text-kwaxolo-green",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => { getSchools().then(setSchools); }, []);
  useEffect(() => { load(); }, [filterRole, filterSchool]);

  function load() {
    setLoading(true);
    getUsers({ role: filterRole || undefined, schoolId: filterSchool || undefined })
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Users</h1>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50"
        >
          <option value="">All schools</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Edit form */}
      {editing && (
        <UserEditForm
          user={editing}
          schools={schools}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-8">No users found.</p>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Email</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">School</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-900">{u.display_name}</td>
                  <td className="px-4 py-3 text-stone-600">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-600 text-xs">
                    {schools.find((s) => s.id === u.school_id)?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(u)}
                      className="text-xs text-kwaxolo-green hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete user "${u.display_name}"?`)) return;
                        await deleteUser(u.id);
                        load();
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserEditForm({ user, schools, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [role, setRole] = useState(user.role);
  const [schoolId, setSchoolId] = useState(user.school_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateUser(user.id, { displayName, role, schoolId: schoolId || null });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-stone-200 rounded-xl p-5 mb-6 bg-stone-50">
      <h3 className="font-semibold text-stone-900 mb-4">Edit user: {user.email}</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600 mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-stone-600 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50"
            >
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600 mb-1">School</label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50"
            >
              <option value="">None</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {error && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-kwaxolo-green text-white font-medium px-5 py-2 rounded-lg text-sm hover:bg-kwaxolo-green/90 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update"}
          </button>
          <button type="button" onClick={onClose} className="text-sm text-stone-500 hover:text-stone-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
