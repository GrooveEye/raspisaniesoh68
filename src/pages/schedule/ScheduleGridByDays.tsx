 import { useMemo } from "react";
 import type { ScheduleLesson, SchoolClass, Subject, Teacher } from "@/types";
 import { ScheduleIssue } from "./scheduleUtils";
 
 interface ScheduleGridByDaysProps {
   days: string[];
   slots: number[];
   classes: SchoolClass[];
   lessons: ScheduleLesson[];
   subjects: Subject[];
   teachers: Teacher[];
   issuesByLessonId: Map<string, ScheduleIssue[]>;
   onCellClick: (classId: string, day: string, slot: number) => void;
 }
 
 export function ScheduleGridByDays(props: ScheduleGridByDaysProps) {
   const { days, slots, classes, lessons, subjects, teachers, issuesByLessonId, onCellClick } = props;
 
   const classLabel = (grade: number, letter: string) => `${grade}${letter}`;
 
   return (
     <div className="rounded-lg border bg-card overflow-auto">
       <div
         className="grid"
         style={{
           gridTemplateColumns: `minmax(60px, 80px) minmax(80px, 100px) repeat(${classes.length}, minmax(180px, 1fr))`,
         }}
       >
         <div className="sticky top-0 bg-card border-b p-3 font-medium">День</div>
         <div className="sticky top-0 bg-card border-b p-3 font-medium">Урок</div>
         {classes.map((c) => (
           <div key={c.id} className="sticky top-0 bg-card border-b p-3 font-medium">
             {classLabel(c.grade, c.letter)}
           </div>
         ))}
 
         {days.map((day) =>
           slots.map((slot, slotIdx) => {
             return (
               <div key={`${day}-${slot}`} className="contents">
                 {slotIdx === 0 ? (
                   <div
                     key={`day-${day}`}
                     className="border-b p-3 text-sm font-medium"
                     style={{ gridRow: `span ${slots.length}` }}
                   >
                     {day}
                   </div>
                 ) : null}
                 <div key={`slot-${day}-${slot}`} className="border-b p-3 text-sm text-muted-foreground">
                   {slot === 0 ? "0-й" : `${slot}-й`}
                 </div>
                 {classes.map((cls) => {
                   const lesson = lessons.find((l) => l.classId === cls.id && l.day === day && l.slot === slot);
                   const hasIssues = lesson ? (issuesByLessonId.get(lesson.id) || []).length > 0 : false;
                   const subject = lesson ? subjects.find((s) => s.id === lesson.subjectId) : null;
                   const teacher = lesson ? teachers.find((t) => t.id === lesson.teacherId) : null;
                   const room = lesson?.room;
 
                   return (
                     <button
                       key={`${cls.id}-${day}-${slot}`}
                       type="button"
                       onClick={() => onCellClick(cls.id, day, slot)}
                       className={
                         "border-b p-3 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring" +
                         (hasIssues ? " ring-1 ring-destructive" : "")
                       }
                     >
                       {lesson ? (
                         <div className="space-y-1">
                           <div className="font-medium leading-snug">{subject?.name || "—"}</div>
                           <div className="text-sm text-muted-foreground leading-snug">{teacher?.fullName || "—"}</div>
                           {room ? <div className="text-xs text-muted-foreground">{room}</div> : null}
                         </div>
                       ) : (
                         <div className="text-sm text-muted-foreground">Добавить…</div>
                       )}
                     </button>
                   );
                 })}
               </div>
             );
           })
         )}
       </div>
     </div>
   );
 }