import { Router } from "express";
import { randomUUID } from "crypto";
import { db, generateJoinCode } from "../db.js";
import { authenticateToken, requireRole } from "../auth.js";

const router = Router();
router.use(authenticateToken, requireRole("teacher"));

// GET /api/teacher/classes
router.get("/classes", (req, res) => {
  const classes = db
    .prepare(
      `SELECT c.id, c.name, c.join_code, c.school_id, s.name as school_name, c.created_at,
              (SELECT COUNT(*) FROM class_members WHERE class_id = c.id) as student_count,
              (SELECT COUNT(*) FROM class_courses WHERE class_id = c.id) as course_count
       FROM classes c
       LEFT JOIN schools s ON s.id = c.school_id
       WHERE c.teacher_id = ?
       ORDER BY c.created_at DESC`
    )
    .all(req.user.id);
  res.json(classes);
});

// POST /api/teacher/classes { name, schoolId }
router.post("/classes", (req, res) => {
  const { name, schoolId } = req.body;
  if (!name) return res.status(400).json({ error: "name is required." });

  if (schoolId) {
    const school = db.prepare("SELECT id FROM schools WHERE id = ?").get(schoolId);
    if (!school) return res.status(404).json({ error: "School not found." });
  }

  let joinCode = generateJoinCode();
  while (db.prepare("SELECT id FROM classes WHERE join_code = ?").get(joinCode)) {
    joinCode = generateJoinCode();
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO classes (id, name, join_code, school_id, teacher_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, joinCode, schoolId || null, req.user.id, Date.now());

  const cls = db.prepare("SELECT * FROM classes WHERE id = ?").get(id);
  res.status(201).json(cls);
});

// POST /api/teacher/classes/:classId/publish { courseId }
router.post("/classes/:classId/publish", (req, res) => {
  const { classId } = req.params;
  const { courseId } = req.body;
  if (!courseId) return res.status(400).json({ error: "courseId is required." });

  const cls = db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(classId, req.user.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(courseId);
  if (!course) return res.status(404).json({ error: "Course not found." });

  const existing = db
    .prepare("SELECT id FROM class_courses WHERE class_id = ? AND course_id = ?")
    .get(classId, courseId);
  if (existing) return res.status(409).json({ error: "Course already published to this class." });

  db.prepare(
    "INSERT INTO class_courses (id, class_id, course_id, published_at) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), classId, courseId, Date.now());

  res.status(201).json({ message: "Course published to class." });
});

// GET /api/teacher/classes/:classId/students
router.get("/classes/:classId/students", (req, res) => {
  const { classId } = req.params;

  const cls = db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(classId, req.user.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const students = db
    .prepare(
      `SELECT u.id, u.email, u.display_name, cm.joined_at
       FROM class_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.class_id = ?
       ORDER BY u.display_name ASC`
    )
    .all(classId);

  const courseIds = db
    .prepare("SELECT course_id FROM class_courses WHERE class_id = ?")
    .all(classId)
    .map((r) => r.course_id);

  const studentsWithProgress = students.map((s) => {
    const progress = db
      .prepare(
        `SELECT course_id, lesson_index, completed_at FROM progress
         WHERE user_id = ? AND course_id IN (${courseIds.map(() => "?").join(",") || "''"})`
      )
      .all(s.id, ...courseIds);
    return { ...s, progress };
  });

  res.json(studentsWithProgress);
});

// DELETE /api/teacher/classes/:classId/courses/:courseId
router.delete("/classes/:classId/courses/:courseId", (req, res) => {
  const { classId, courseId } = req.params;

  const cls = db.prepare("SELECT * FROM classes WHERE id = ? AND teacher_id = ?").get(classId, req.user.id);
  if (!cls) return res.status(404).json({ error: "Class not found." });

  const result = db
    .prepare("DELETE FROM class_courses WHERE class_id = ? AND course_id = ?")
    .run(classId, courseId);

  if (result.changes === 0) return res.status(404).json({ error: "Course not published in this class." });

  res.json({ message: "Course unpublished from class." });
});

export default router;
