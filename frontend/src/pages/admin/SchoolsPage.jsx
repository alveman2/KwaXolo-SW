import { useState, useEffect } from "react";
import { getSchools, createSchool, updateSchool, deleteSchool } from "../../lib/adminApi";

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // school object or "new"
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  function load() {
    setLoading(true);
    getSchools().then(setSchools).finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Schools</h1>
        <button
          onClick={() => setEditing({ id: null, name: "", code: "" })}
          className="bg-kwaxolo-green text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-kwaxolo-green/90 transition"
        >
          + Add school
        </button>
      </div>

      {editing && (
        <SchoolForm
          school={editing}
          onClose={() => { setEditing(null); setError(""); }}
          onSaved={() => { setEditing(null); load(); }}
          error={error}
          setError={setError}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Code</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Users</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Classes</th>
                <th className="text-right px-4 py-3 font-medium text-stone-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-900">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-stone-600 text-xs">{s.code}</td>
                  <td className="px-4 py-3 text-center text-stone-600">{s.user_count}</td>
                  <td className="px-4 py-3 text-center text-stone-600">{s.class_count}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(s)}
                      className="text-xs text-kwaxolo-green hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete "${s.name}"?`)) return;
                        await deleteSchool(s.id);
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

function SchoolForm({ school, onClose, onSaved, error, setError }) {
  const [name, setName] = useState(school.name || "");
  const [code, setCode] = useState(school.code || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (school.id) {
        await updateSchool(school.id, { name: name.trim(), code: code.trim() });
      } else {
        await createSchool(name.trim(), code.trim());
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-stone-200 rounded-xl p-5 mb-6 bg-stone-50">
      <h3 className="font-semibold text-stone-900 mb-4">
        {school.id ? "Edit school" : "Add new school"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-stone-600 mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
            />
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
            {saving ? "Saving..." : school.id ? "Update" : "Create"}
          </button>
          <button type="button" onClick={onClose} className="text-sm text-stone-500 hover:text-stone-700">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
