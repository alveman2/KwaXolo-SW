import { useState, useEffect } from "react";
import { joinClass, getMyClasses } from "../../lib/studentApi";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    getMyClasses()
      .then(setClasses)
      .finally(() => setClassesLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    try {
      const result = await joinClass(trimmed);
      setSuccess(`Joined "${result.name}" successfully!`);
      setCode("");
      // Refresh classes list
      getMyClasses().then(setClasses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
        Join a Class
      </h2>
      <p className="text-stone-600 mb-6">
        Enter the code your teacher gave you.
      </p>

      <div className="border border-stone-200 rounded-xl p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Class code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD-123"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
            />
            <p className="mt-1 text-xs text-stone-400">
              Format: 4 letters, dash, 3 numbers (e.g. MZGK-809)
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-2.5 bg-kwaxolo-green text-white font-medium rounded-lg text-sm hover:bg-kwaxolo-green/90 transition disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join class"}
          </button>
        </form>
      </div>

      {/* Existing classes */}
      <h3 className="font-semibold text-stone-900 text-lg mb-3">My Classes</h3>

      {classesLoading && (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!classesLoading && classes.length === 0 && (
        <p className="text-sm text-stone-500">You haven't joined any classes yet.</p>
      )}

      {!classesLoading && classes.length > 0 && (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="border border-stone-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-stone-900 text-sm">{cls.name}</div>
                {cls.school_name && (
                  <div className="text-xs text-stone-500 mt-0.5">{cls.school_name}</div>
                )}
              </div>
              <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full font-mono">
                {cls.join_code}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
