import { useState, useEffect } from "react";
import {
  getTeacherClasses,
  createClass,
  publishCourse,
  unpublishCourse,
  getClassStudents,
  getClassCourses,
  getSchools,
} from "../lib/teacherApi.js";
import { listCourses } from "../lib/api.js";
import { useStrings } from "../lib/i18n.jsx";

export default function TeacherClassesScreen() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    loadClasses();
  }, []);

  function loadClasses() {
    setLoading(true);
    getTeacherClasses()
      .then(setClasses)
      .finally(() => setLoading(false));
  }

  if (selectedClass) {
    return (
      <ClassDetail
        classInfo={selectedClass}
        onBack={() => {
          setSelectedClass(null);
          loadClasses();
        }}
      />
    );
  }

  return (
    <div className="py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-kwaxolo-gold/20 text-stone-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <span>📋</span> Class management
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
            My Classes
          </h2>
          <p className="text-stone-600">
            Create classes, share join codes, and publish courses.
          </p>
        </div>
      </div>

      <CreateClassForm onCreated={loadClasses} />

      {loading && (
        <div className="space-y-4 mt-6">
          {[1, 2].map((n) => (
            <div key={n} className="h-24 bg-stone-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && classes.length === 0 && (
        <div className="text-center py-12 text-stone-500 text-sm mt-6">
          No classes yet. Create your first class above.
        </div>
      )}

      {!loading && classes.length > 0 && (
        <div className="space-y-3 mt-6">
          {classes.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className="w-full text-left border border-stone-200 hover:border-kwaxolo-green rounded-xl p-5 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-900 group-hover:text-kwaxolo-green transition">
                    {cls.name}
                  </h3>
                  {cls.school_name && (
                    <p className="text-xs text-stone-500 mt-0.5">{cls.school_name}</p>
                  )}
                </div>
                <span className="flex-shrink-0 text-xs bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full font-mono">
                  {cls.join_code}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                <span>{cls.student_count} student{cls.student_count !== 1 ? "s" : ""}</span>
                <span className="text-stone-300">·</span>
                <span>{cls.course_count} course{cls.course_count !== 1 ? "s" : ""}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create class form ───────────────────────────────────────────────────────

function CreateClassForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && schools.length === 0) {
      getSchools().then(setSchools);
    }
  }, [open]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createClass(name.trim(), schoolId);
      setName("");
      setSchoolId("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border-2 border-dashed border-stone-300 hover:border-kwaxolo-green rounded-xl p-4 text-sm font-medium text-stone-500 hover:text-kwaxolo-green transition"
      >
        + Create new class
      </button>
    );
  }

  return (
    <div className="border border-stone-200 rounded-xl p-5">
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Class name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grade 10A Digital Skills"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            School <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
          >
            <option value="">No school selected</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="bg-kwaxolo-green text-white font-medium px-6 py-2.5 rounded-lg text-sm hover:bg-kwaxolo-green/90 transition disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create class"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Class detail view ───────────────────────────────────────────────────────

function ClassDetail({ classInfo, onBack }) {
  const t = useStrings();
  const tc = t.teacherClasses;

  const [tab, setTab] = useState("courses"); // "courses" | "students"
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [publishedCourses, setPublishedCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedCourseToPublish, setSelectedCourseToPublish] = useState("");
  const [recentlyPublished, setRecentlyPublished] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (tab === "students") loadStudents();
  }, [tab]);

  async function loadCourses() {
    setCoursesLoading(true);
    try {
      const [all, published] = await Promise.all([
        listCourses(),
        getClassCourses(classInfo.id),
      ]);
      setAllCourses(all);
      setPublishedCourses(published);
    } finally {
      setCoursesLoading(false);
    }
  }

  async function loadPublishedCourses() {
    try {
      const published = await getClassCourses(classInfo.id);
      setPublishedCourses(published);
    } catch {
      // non-fatal
    }
  }

  async function loadStudents() {
    setStudentsLoading(true);
    try {
      const s = await getClassStudents(classInfo.id);
      setStudents(s);
    } finally {
      setStudentsLoading(false);
    }
  }

  async function handlePublish() {
    if (!selectedCourseToPublish) return;
    setPublishing(true);
    try {
      await publishCourse(classInfo.id, selectedCourseToPublish);
      setSelectedCourseToPublish("");
      await loadPublishedCourses();
      setRecentlyPublished(true);
      setTimeout(() => setRecentlyPublished(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish(courseId) {
    if (!window.confirm(tc.removeConfirm)) return;
    try {
      await unpublishCourse(classInfo.id, courseId);
      await loadPublishedCourses();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="py-8">
      <button onClick={onBack} className="text-sm text-stone-500 hover:text-stone-800 mb-6">
        ← Back to classes
      </button>

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-1">
          {classInfo.name}
        </h2>
        <div className="flex items-center gap-3 text-sm text-stone-500">
          {classInfo.school_name && <span>{classInfo.school_name}</span>}
          <span className="text-stone-300">·</span>
          <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-xs">
            {classInfo.join_code}
          </span>
          <span className="text-stone-300">·</span>
          <span>{classInfo.student_count} students</span>
        </div>
      </div>

      {/* Join code highlight */}
      <div className="border border-kwaxolo-green/30 bg-kwaxolo-green/5 rounded-xl p-4 mb-6">
        <div className="text-xs uppercase tracking-wide text-kwaxolo-green font-bold mb-1">
          Join code — share with students
        </div>
        <div className="text-2xl font-bold font-mono text-stone-900 tracking-wider">
          {classInfo.join_code}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-xl p-1">
        <button
          onClick={() => setTab("courses")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "courses" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Courses ({publishedCourses.length})
        </button>
        <button
          onClick={() => setTab("students")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "students" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Students ({classInfo.student_count})
        </button>
      </div>

      {/* Courses tab */}
      {tab === "courses" && (
        <div>
          {/* Publish form */}
          <div className="border border-stone-200 rounded-xl p-4 mb-4">
            <div className="text-sm font-medium text-stone-700 mb-2">
              Publish a course to this class
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCourseToPublish}
                onChange={(e) => setSelectedCourseToPublish(e.target.value)}
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-kwaxolo-green/50 focus:border-kwaxolo-green"
              >
                <option value="">Select a course...</option>
                {allCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <button
                onClick={handlePublish}
                disabled={!selectedCourseToPublish || publishing}
                className="bg-kwaxolo-green text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-kwaxolo-green/90 transition disabled:opacity-50"
              >
                {publishing ? "..." : "Publish"}
              </button>
            </div>
            {recentlyPublished && (
              <p className="mt-2 text-sm text-kwaxolo-green font-medium">{tc.publishedSuccess}</p>
            )}
          </div>

          {/* Published courses list */}
          {coursesLoading ? (
            <div className="h-20 bg-stone-100 rounded-xl animate-pulse" />
          ) : publishedCourses.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-8">{tc.noPublishedCourses}</p>
          ) : (
            <div className="space-y-3">
              {publishedCourses.map((course) => (
                <div
                  key={course.id}
                  className="border border-stone-200 rounded-xl p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 text-sm">{course.title}</div>
                    <div className="text-xs text-stone-500 mt-0.5 line-clamp-1">{course.description}</div>
                    <div className="text-xs text-stone-400 mt-1">{course.duration_minutes} min · {course.level}</div>
                  </div>
                  <button
                    onClick={() => handleUnpublish(course.id)}
                    className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
                  >
                    {tc.removeButton}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Students tab */}
      {tab === "students" && (
        <div>
          {studentsLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-stone-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!studentsLoading && students.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-8">
              No students have joined yet. Share the join code above.
            </p>
          )}

          {!studentsLoading && students.length > 0 && (
            <div className="space-y-3">
              {students.map((s) => (
                <div key={s.id} className="border border-stone-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-stone-900 text-sm">{s.display_name}</div>
                      <div className="text-xs text-stone-500">{s.email}</div>
                    </div>
                    <span className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                      {s.progress?.length ?? 0} lessons done
                    </span>
                  </div>
                  {s.progress && s.progress.length > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-kwaxolo-green rounded-full"
                          style={{ width: `${Math.min(100, (s.progress.length / Math.max(1, publishedCourses.length * 4)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
