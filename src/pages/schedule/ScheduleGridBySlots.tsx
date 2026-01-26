import { useMemo } from "react";
import type { ScheduleLesson, SchoolClass, Subject, Teacher } from "@/types";
import { ScheduleIssue } from "./scheduleUtils";

interface ScheduleGridBySlotsProps {
  days: string[];
  classes: SchoolClass[];
  lessons: ScheduleLesson[];
  subjects: Subject[];
  teachers: Teacher[];
  issuesByLessonId: Map<string, ScheduleIssue[]>;
  onCellClick: (classId: string, day: string, slot: number) => void;
}

export function ScheduleGridBySlots(props: ScheduleGridBySlotsProps) {
  const { days, classes, lessons, subjects, teachers, issuesByLessonId, onCellClick } = props;

  const classLabel = (grade: number, letter: string) => `${grade}${letter}`;

  return (
    <div className="rounded-lg border bg-card overflow-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `minmax(100px, 140px) repeat(${days.length}, minmax(140px, 1fr))`,
        }}
      >
        <div className="sticky top-0 bg-card border-b p-3 font-medium">Класс</div>
        {days.map((day) => (
          <div key={day} className="sticky top-0 bg-card border-b p-3 font-medium">
            {day}
          </div>
        ))}

        {classes.map((cls) => (
          <div key={cls.id} className="contents">
            <div className="border-b p-3 font-medium">
              {classLabel(cls.grade, cls.letter)}
            </div>
            {days.map((day) => {
              const dayLessons = lessons.filter((l) => l.classId === cls.id && l.day === day)
                .sort((a, b) => a.slot - b.slot);
              const hasIssues = dayLessons.some(
                (lesson) => (issuesByLessonId.get(lesson.id) || []).length > 0
              );

              return (
                <div
                  key={`${cls.id}-${day}`}
                  className={
                    "border-b p-2 hover:bg-muted/50 transition-colors" +
                    (hasIssues ? " ring-1 ring-destructive" : "")
                  }
                >
                  {dayLessons.length > 0 ? (
                    <div className="space-y-2">
                      {dayLessons.map((lesson) => {
                        const subject = subjects.find((s) => s.id === lesson.subjectId);
                        const teacher = teachers.find((t) => t.id === lesson.teacherId);
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => onCellClick(cls.id, day, lesson.slot)}
                            className="w-full text-left p-2 rounded hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-muted-foreground font-medium min-w-[24px]">
                                {lesson.slot === -1 ? "-1" : lesson.slot === 0 ? "0" : lesson.slot}
                              </span>
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="font-medium text-sm leading-tight truncate">
                                  {subject?.name || "—"}
                                </div>
                                <div className="text-xs text-muted-foreground leading-tight truncate">
                                  {teacher?.fullName || "—"}
                                </div>
                                {lesson.room ? (
                                  <div className="text-xs text-muted-foreground/70">
                                    {lesson.room}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">—</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}