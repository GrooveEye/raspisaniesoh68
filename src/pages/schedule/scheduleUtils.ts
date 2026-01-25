import type { ScheduleLesson, TeacherAvailability } from "@/types";

export type ScheduleIssueType = "teacher_conflict" | "room_conflict" | "teacher_unavailable";

export interface ScheduleIssue {
  type: ScheduleIssueType;
  message: string;
  lessonId: string;
}

export function getScheduleIssues(params: {
  lessons: ScheduleLesson[];
  availability: TeacherAvailability;
  selectedClassId?: string;
}) {
  const { lessons, availability, selectedClassId } = params;

  const issues: ScheduleIssue[] = [];

  // For fast lookups: (day|slot|teacherId) and (day|slot|roomId)
  const byTeacher = new Map<string, ScheduleLesson[]>();
  const byRoom = new Map<string, ScheduleLesson[]>();

  for (const l of lessons) {
    const tKey = `${l.day}__${l.slot}__${l.teacherId}`;
    const rKey = l.roomId ? `${l.day}__${l.slot}__${l.roomId}` : null;

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
  }

  for (const [, list] of byTeacher) {
    if (list.length <= 1) continue;
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
