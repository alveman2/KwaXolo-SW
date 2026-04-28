// Student API helpers — all require auth token

function authHeaders() {
  const token = localStorage.getItem("kwaxolo_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function joinClass(joinCode) {
  const res = await fetch("/api/classes/join", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ joinCode }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to join class");
  return data;
}

export async function getMyClasses() {
  const res = await fetch("/api/my/classes", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load classes");
  return res.json();
}

export async function getMyFeed() {
  const res = await fetch("/api/my/feed", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load feed");
  return res.json();
}

export async function getMyProgress() {
  const res = await fetch("/api/my/progress", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load progress");
  return res.json();
}

export async function markLessonComplete(courseId, lessonIndex) {
  const res = await fetch("/api/my/progress", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ courseId, lessonIndex }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to mark progress");
  return data;
}
