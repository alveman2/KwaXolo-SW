import { useState, useEffect } from "react";
import { getClasses, getSchools } from "../../lib/adminApi";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSchool, setFilterSchool] = useState("");

  useEffect(() => { getSchools().then(setSchools); }, []);
  useEffect(() => { load(); }, [filterSchool]);

  function load() {
    setLoading(true);
    getClasses({ schoolId: filterSchool || undefined })
      .then(setClasses)
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Classes</h1>

      <div className="mb-4">
        <select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50"
        >
          <option value="">All schools</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : classes.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-8">No classes found.</p>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Join Code</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">School</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Teacher</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Students</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Courses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-900">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-600">{c.join_code}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs">{c.school_name || "—"}</td>
                  <td className="px-4 py-3 text-stone-600 text-xs">{c.teacher_name || "—"}</td>
                  <td className="px-4 py-3 text-center text-stone-600">{c.student_count}</td>
                  <td className="px-4 py-3 text-center text-stone-600">{c.course_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
