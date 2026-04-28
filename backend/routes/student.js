import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { authenticateToken, requireRole } from "../auth.js";

const router = Router();
const auth = [authenticateToken, requireRole("student")];

// POST /api/classes/join { joinCode }
router.post("/classes/join", ...auth, (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) return res.status(400).json({ error: "joinCode is required." });

  const cls = db.prepare("SELECT * FROM classes WHERE join_code = ?").get(joinCode);
  if (!cls) return res.status(404).json({ error: "Invalid join code." });

  const existing = db
    .prepare("SELECT id FROM class_members WHERE class_id = ? AND user_id = ?")
    .get(cls.id, req.user.id);
  if (existing) return res.status(409).json({ error: "Already joined this class." });

  db.prepare(
    "INSERT INTO class_members (id, class_id, user_id, joined_at) VALUES (?, ?, ?, ?)"
  ).run(randomUUID(), cls.id, req.user.id, Date.now());

  const school = cls.school_id
    ? db.prepare("SELECT name FROM schools WHERE id = ?").get(cls.school_id)
    : null;

  res.json({
    id: cls.id,
    name: cls.name,
    join_code: cls.join_code,
    school_name: school?.name ?? null,
  });
});

// GET /api/my/classes
router.get("/my/classes", ...auth, (req, res) => {
  const classes = db
    .prepare(
      `SELECT c.id, c.name, c.join_code, s.name as school_name, cm.joined_at
       FROM class_members cm
       JOIN classes c ON c.id = cm.class_id
       LEFT JOIN schools s ON s.id = c.school_id
       WHERE cm.user_id = ?
       ORDER BY cm.joined_at DESC`
    )
    .all(req.user.id);
  res.json(classes);
});

// GET /api/my/feed — courses from joined classes with progress
router.get("/my/feed", ...auth, (req, res) => {
  const courses = db
    .prepare(
      `SELECT DISTINCT
         co.id, co.title, co.description, co.category, co.level,
         co.duration_minutes, co.lessons_json,
         cc.class_id, cl.name as class_name
       FROM class_members cm
       JOIN class_courses cc ON cc.class_id = cm.class_id
       JOIN courses co ON co.id = cc.course_id
       JOIN classes cl ON cl.id = cc.class_id
       WHERE cm.user_id = ?
       ORDER BY cc.published_at DESC`
    )
    .all(req.user.id);

  const progress = db
    .prepare("SELECT course_id, lesson_index, completed_at FROM progress WHERE user_id = ?")
    .all(req.user.id);

  const progressMap = {};
  for (const p of progress) {
    if (!progressMap[p.course_id]) progressMap[p.course_id] = [];
    progressMap[p.course_id].push({ lesson_index: p.lesson_index, completed_at: p.completed_at });
  }

  const result = courses.map((c) => ({
    ...c,
    lessons: JSON.parse(c.lessons_json),
    lessons_json: undefined,
    progress: progressMap[c.id] || [],
  }));

  res.json(result);
});

// GET /api/my/progress
router.get("/my/progress", ...auth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.course_id, p.lesson_index, p.completed_at, co.title as course_title
       FROM progress p
       JOIN courses co ON co.id = p.course_id
       WHERE p.user_id = ?
       ORDER BY p.completed_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// POST /api/my/progress { courseId, lessonIndex }
router.post("/my/progress", ...auth, (req, res) => {
  const { courseId, lessonIndex } = req.body;
  if (!courseId || lessonIndex === undefined) {
    return res.status(400).json({ error: "courseId and lessonIndex are required." });
  }

  const existing = db
    .prepare("SELECT id FROM progress WHERE user_id = ? AND course_id = ? AND lesson_index = ?")
    .get(req.user.id, courseId, lessonIndex);
  if (existing) return res.json({ message: "Already completed." });

  db.prepare(
    "INSERT INTO progress (id, user_id, course_id, lesson_index, completed_at) VALUES (?, ?, ?, ?, ?)"
  ).run(randomUUID(), req.user.id, courseId, lessonIndex, Date.now());

  res.status(201).json({ message: "Lesson marked complete." });
});

export default router;
