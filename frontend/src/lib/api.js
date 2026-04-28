// Thin wrapper around the backend. Vite dev proxy handles localhost routing.

export async function findOpportunity(observation, history = []) {
  const res = await fetch("/api/opportunity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observation, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || "Request failed");
  }
  return res.json();
}

export async function listCourses(category) {
  const url = category ? `/api/courses?category=${category}` : "/api/courses";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load courses");
  return res.json();
}

export async function getCourse(id) {
  const res = await fetch(`/api/courses/${id}`);
  if (!res.ok) throw new Error("Course not found");
  return res.json();
}

export async function createCourse(course) {
  const res = await fetch("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(course),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create course");
  }
  return res.json();
}

export async function generateCourse(teacherInput, gradeLevel) {
  const res = await fetch("/api/teacher/generate-course", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teacherInput, gradeLevel }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || "Course generation failed");
  }
  return res.json();
}

export async function translate(text, targetLang) {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, targetLang }),
  });
  if (!res.ok) throw new Error("Translation failed");
  const data = await res.json();
  return data.translated;
}

export async function refineConversation(history, question) {
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || "Request failed");
  }
  return res.json();
}
