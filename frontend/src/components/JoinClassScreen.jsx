import { useState, useEffect } from "react";
import { joinClass, getMyClasses } from "../lib/studentApi.js";
import { useStrings } from "../lib/i18n.jsx";

export default function JoinClassScreen({ onViewCourses }) {
  const t = useStrings();
  const tj = t.joinClass;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(null); // { name, teacher_name } on success

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  function loadClasses() {
    setClassesLoading(true);
    getMyClasses()
      .then(setClasses)
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setJoined(null);
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    try {
      const result = await joinClass(trimmed);
      setJoined(result);
      setCode("");
      loadClasses();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">
        {tj.heading}
      </h2>
      <p className="text-stone-600 mb-8">{tj.subhead}</p>

      {/* Join form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={tj.inputPlaceholder}
            className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-stone-900 font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-kwaxolo-green focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="bg-kwaxolo-green hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition whitespace-nowrap text-sm"
          >
            {loading ? tj.joining : tj.submitButton}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </form>

      {/* Success card */}
      {joined && (
        <div className="mb-8 p-5 bg-kwaxolo-green/5 border border-kwaxolo-green/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-kwaxolo-green text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              ✓
            </span>
            <span className="font-semibold text-stone-900">
              {tj.successJoined} {joined.name}
            </span>
          </div>
          {joined.school_name && (
            <p className="text-sm text-stone-500 ml-7">{joined.school_name}</p>
          )}
          <button
            onClick={onViewCourses}
            className="mt-3 ml-7 text-sm text-kwaxolo-green font-medium hover:underline"
          >
            {tj.viewCourses}
          </button>
        </div>
      )}

      {/* Joined classes list */}
      <div>
        <h3 className="font-semibold text-stone-900 text-lg mb-4">{tj.myClasses}</h3>

        {classesLoading && (
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!classesLoading && classes.length === 0 && (
          <p className="text-sm text-stone-500 py-6 text-center">{tj.noClasses}</p>
        )}

        {!classesLoading && classes.length > 0 && (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="border border-stone-200 rounded-xl p-5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-stone-900 text-sm">
                    {cls.name}
                  </div>
                  {cls.school_name && (
                    <div className="text-xs text-stone-500 mt-0.5">
                      {cls.school_name}
                    </div>
                  )}
                  <div className="text-xs font-mono text-stone-400 mt-0.5">
                    {cls.join_code}
                  </div>
                </div>
                <button
                  onClick={onViewCourses}
                  className="flex-shrink-0 text-sm text-kwaxolo-green font-medium hover:underline"
                >
                  {tj.viewCourses}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
