// Admin API helpers — require admin auth token

function authHeaders() {
  const token = localStorage.getItem("kwaxolo_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Stats
export async function getStats() {
  const res = await fetch("/api/admin/stats", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

// Schools
export async function getSchools() {
  const res = await fetch("/api/admin/schools", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load schools");
  return res.json();
}

export async function createSchool(name, code) {
  const res = await fetch("/api/admin/schools", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create school");
  return data;
}

export async function updateSchool(id, { name, code }) {
  const res = await fetch(`/api/admin/schools/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ name, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update school");
  return data;
}

export async function deleteSchool(id) {
  const res = await fetch(`/api/admin/schools/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete school");
  return data;
}

// Users
export async function getUsers({ role, schoolId } = {}) {
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (schoolId) params.set("schoolId", schoolId);
  const qs = params.toString();
  const res = await fetch(`/api/admin/users${qs ? `?${qs}` : ""}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

export async function updateUser(id, { displayName, role, schoolId }) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ displayName, role, schoolId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data;
}

export async function deleteUser(id) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete user");
  return data;
}

// Classes
export async function getClasses({ schoolId } = {}) {
  const params = new URLSearchParams();
  if (schoolId) params.set("schoolId", schoolId);
  const qs = params.toString();
  const res = await fetch(`/api/admin/classes${qs ? `?${qs}` : ""}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load classes");
  return res.json();
}
