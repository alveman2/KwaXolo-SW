import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { authenticateToken, requireRole } from "../auth.js";

const router = Router();
router.use(authenticateToken, requireRole("admin"));

// ============================================================================
// SCHOOLS
// ============================================================================

// GET /api/admin/schools
router.get("/schools", (req, res) => {
  const schools = db
    .prepare(
      `SELECT s.*,
              (SELECT COUNT(*) FROM users WHERE school_id = s.id) as user_count,
              (SELECT COUNT(*) FROM classes WHERE school_id = s.id) as class_count
       FROM schools s ORDER BY s.name ASC`
    )
    .all();
  res.json(schools);
});

// POST /api/admin/schools { name, code }
router.post("/schools", (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name and code are required." });

  const existing = db.prepare("SELECT id FROM schools WHERE code = ?").get(code);
  if (existing) return res.status(409).json({ error: "School code already exists." });

  const id = randomUUID();
  db.prepare("INSERT INTO schools (id, name, code, created_at) VALUES (?, ?, ?, ?)").run(
    id, name, code, Date.now()
  );

  const school = db.prepare("SELECT * FROM schools WHERE id = ?").get(id);
  res.status(201).json(school);
});

// PUT /api/admin/schools/:id
router.put("/schools/:id", (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;

  const school = db.prepare("SELECT * FROM schools WHERE id = ?").get(id);
  if (!school) return res.status(404).json({ error: "School not found." });

  if (code && code !== school.code) {
    const dup = db.prepare("SELECT id FROM schools WHERE code = ? AND id != ?").get(code, id);
    if (dup) return res.status(409).json({ error: "School code already exists." });
  }

  db.prepare("UPDATE schools SET name = ?, code = ? WHERE id = ?").run(
    name || school.name,
    code || school.code,
    id
  );

  res.json(db.prepare("SELECT * FROM schools WHERE id = ?").get(id));
});

// DELETE /api/admin/schools/:id
router.delete("/schools/:id", (req, res) => {
  const { id } = req.params;
  const school = db.prepare("SELECT * FROM schools WHERE id = ?").get(id);
  if (!school) return res.status(404).json({ error: "School not found." });

  db.prepare("DELETE FROM schools WHERE id = ?").run(id);
  res.json({ message: "School deleted." });
});

// ============================================================================
// USERS
// ============================================================================

// GET /api/admin/users (?role=, ?schoolId=)
router.get("/users", (req, res) => {
  const { role, schoolId } = req.query;
  let sql = "SELECT id, email, display_name, role, school_id, created_at FROM users WHERE 1=1";
  const params = [];

  if (role) {
    sql += " AND role = ?";
    params.push(role);
  }
  if (schoolId) {
    sql += " AND school_id = ?";
    params.push(schoolId);
  }

  sql += " ORDER BY created_at DESC";
  res.json(db.prepare(sql).all(...params));
});

// PUT /api/admin/users/:id
router.put("/users/:id", (req, res) => {
  const { id } = req.params;
  const { displayName, role, schoolId } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found." });

  if (role && !["student", "teacher", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role." });
  }

  db.prepare("UPDATE users SET display_name = ?, role = ?, school_id = ? WHERE id = ?").run(
    displayName || user.display_name,
    role || user.role,
    schoolId !== undefined ? schoolId : user.school_id,
    id
  );

  const updated = db
    .prepare("SELECT id, email, display_name, role, school_id, created_at FROM users WHERE id = ?")
    .get(id);
  res.json(updated);
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", (req, res) => {
  const { id } = req.params;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return res.status(404).json({ error: "User not found." });

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  res.json({ message: "User deleted." });
});

// ============================================================================
// CLASSES
// ============================================================================

// GET /api/admin/classes (?schoolId=)
router.get("/classes", (req, res) => {
  const { schoolId } = req.query;
  let sql = `
    SELECT c.*, s.name as school_name, u.display_name as teacher_name,
           (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as student_count,
           (SELECT COUNT(*) FROM class_courses WHERE class_id = c.id) as course_count
    FROM classes c
    LEFT JOIN schools s ON s.id = c.school_id
    LEFT JOIN users u ON u.id = c.teacher_id
    WHERE 1=1`;
  const params = [];

  if (schoolId) {
    sql += " AND c.school_id = ?";
    params.push(schoolId);
  }

  sql += " ORDER BY c.created_at DESC";
  res.json(db.prepare(sql).all(...params));
});

// ============================================================================
// STATS
// ============================================================================

// GET /api/admin/stats
router.get("/stats", (req, res) => {
  const totalStudents = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'student'").get().n;
  const totalTeachers = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'teacher'").get().n;
  const totalSchools = db.prepare("SELECT COUNT(*) as n FROM schools").get().n;
  const totalClasses = db.prepare("SELECT COUNT(*) as n FROM classes").get().n;
  const totalCourses = db.prepare("SELECT COUNT(*) as n FROM courses").get().n;
  const totalCompletions = db.prepare("SELECT COUNT(*) as n FROM progress").get().n;

  res.json({
    totalStudents,
    totalTeachers,
    totalSchools,
    totalClasses,
    totalCourses,
    totalCompletions,
  });
});

export default router;
