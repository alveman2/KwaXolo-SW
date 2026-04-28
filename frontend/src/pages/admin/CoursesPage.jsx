import { useState, useEffect } from "react";
import { listCourses } from "../../lib/api";

const CATEGORY_LABEL = {
  phase1: "Phase 1",
  phase2: "Phase 2",
  business: "Business",
  custom: "Custom",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Courses</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <p className="text-sm text-stone-500 text-center py-8">No courses found.</p>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-600">Title</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Category</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Level</th>
                <th className="text-center px-4 py-3 font-medium text-stone-600">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-900">{c.title}</div>
                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">{c.description}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
                      {CATEGORY_LABEL[c.category] || c.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-stone-600 capitalize">{c.level}</td>
                  <td className="px-4 py-3 text-center text-xs text-stone-600">{c.duration_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
