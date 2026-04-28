// Teacher API helpers — require auth token

function authHeaders() {
  const token = localStorage.getItem("kwaxolo_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getTeacherClasses() {
  const res = await fetch("/api/teacher/classes", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load classes");
  return res.json();
}

export async function createClass(name, schoolId) {
  const res = await fetch("/api/teacher/classes", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, schoolId: schoolId || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create class");
  return data;
}

export async function publishCourse(classId, courseId) {
  const res = await fetch(`/api/teacher/classes/${classId}/publish`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ courseId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to publish course");
  return data;
}

export async function unpublishCourse(classId, courseId) {
  const res = await fetch(`/api/teacher/classes/${classId}/courses/${courseId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to unpublish course");
  return data;
}

export async function getClassStudents(classId) {
  const res = await fetch(`/api/teacher/classes/${classId}/students`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load students");
  return res.json();
}

export async function getSchools() {
  const res = await fetch("/api/schools");
  if (!res.ok) return [];
  return res.json();
}
