import type { ScheduleLesson, TeacherAvailability, ScheduleAnchor } from "@/types";

export type ScheduleIssueType =
  | "teacher_conflict"
  | "room_conflict"
  | "teacher_unavailable"
  | "anchor_mismatch";

export interface ScheduleIssue {
  type: ScheduleIssueType;
  message: string;
  lessonId: string;
}

export function getScheduleIssues(params: {
  lessons: ScheduleLesson[];
  availability: TeacherAvailability;
  anchors?: ScheduleAnchor[];
  selectedClassId?: string;
}) {
  const { lessons, availability, anchors = [], selectedClassId } = params;

  const EXTR_PREFIX = "extr_";

  const issues: ScheduleIssue[] = [];

  // For fast lookups: (day|slot|teacherId) and (day|slot|room)
  const byTeacher = new Map<string, ScheduleLesson[]>();
  const byRoom = new Map<string, ScheduleLesson[]>();

  // В расписании проверяем закрепления по предметам и по внеурочной деятельности (как псевдо‑предметы)
  const anchorByClassSubject = new Map<string, ScheduleAnchor>();
  for (const a of anchors) {
    if (a.subjectId) {
      anchorByClassSubject.set(`${a.classId}__${a.subjectId}`, a);
      continue;
    }
    if (a.extracurricularId) {
      anchorByClassSubject.set(`${a.classId}__${EXTR_PREFIX}${a.extracurricularId}`, a);
    }
  }

  for (const l of lessons) {
    const tKey = `${l.day}__${l.slot}__${l.teacherId}`;
    const room = (l.room || "").trim();
    const rKey = room ? `${l.day}__${l.slot}__${room.toLowerCase()}` : null;

    byTeacher.set(tKey, [...(byTeacher.get(tKey) || []), l]);
    if (rKey) byRoom.set(rKey, [...(byRoom.get(rKey) || []), l]);

    const teacherDay = availability[l.teacherId]?.[l.day];
    const isAvailable = teacherDay?.[l.slot];
    if (isAvailable === false) {
      issues.push({
        type: "teacher_unavailable",
        lessonId: l.id,
        message: "Учитель недоступен в этот слот",
      });
    }

    const anchor = anchorByClassSubject.get(`${l.classId}__${l.subjectId}`);
    if (anchor && (anchor.day !== l.day || anchor.slot !== l.slot)) {
      issues.push({
        type: "anchor_mismatch",
        lessonId: l.id,
        message: "Нарушено закрепление предмета (день/урок)",
      });
    }
  }

  for (const [, list] of byTeacher) {
    if (list.length <= 1) continue;
    // Если это одно и то же «общее занятие» (например, внеурочная деятельность на параллель), конфликт не считаем
    const sharedId = list[0]?.sharedGroupId;
    if (sharedId && list.every((l) => l.sharedGroupId === sharedId)) continue;
    for (const l of list) {
      issues.push({
        type: "teacher_conflict",
        lessonId: l.id,
        message: "Конфликт учителя (две параллельные ставки)",
      });
    }
  }

  for (const [, list] of byRoom) {
    if (list.length <= 1) continue;
    const sharedId = list[0]?.sharedGroupId;
    if (sharedId && list.every((l) => l.sharedGroupId === sharedId)) continue;
    for (const l of list) {
      issues.push({
        type: "room_conflict",
        lessonId: l.id,
        message: "Конфликт кабинета (занят одновременно)",
      });
    }
  }

  const byLessonId = new Map<string, ScheduleIssue[]>();
  for (const issue of issues) {
    byLessonId.set(issue.lessonId, [...(byLessonId.get(issue.lessonId) || []), issue]);
  }

  const selectedClassIssues = selectedClassId
    ? issues.filter((i) => lessons.find((l) => l.id === i.lessonId)?.classId === selectedClassId)
    : issues;

  return { issues, byLessonId, selectedClassIssues };
}
