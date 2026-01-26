 import * as XLSX from "xlsx-js-style";
 import type { ScheduleLesson, SchoolClass, Subject, Teacher, WeekGrid } from "@/types";
 
 /**
  * Экспорт расписания в Excel (два варианта: по классам и по дням)
  */
 export function exportScheduleToExcel(params: {
   lessons: ScheduleLesson[];
   classes: SchoolClass[];
   subjects: Subject[];
   teachers: Teacher[];
   weekGrid: WeekGrid;
 }) {
   const { lessons, classes, subjects, teachers, weekGrid } = params;
 
   const days =
     weekGrid.weekType === 6
       ? ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
       : ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
 
  const includeMinusByDay = weekGrid.includeMinusOneLessonDays ?? {};
  const hasMinusOne = days.some((d) => Boolean(includeMinusByDay[d]));

   const slotsStart = weekGrid.includeZeroLesson ? 0 : 1;
   const slotsEnd = weekGrid.slotsPerDay;
   const slots: number[] = [];
  if (hasMinusOne) slots.push(-1);
   for (let s = slotsStart; s <= slotsEnd; s++) slots.push(s);
 
   const sortedClasses = classes
     .slice()
     .sort((a, b) => (a.grade !== b.grade ? a.grade - b.grade : a.letter.localeCompare(b.letter, "ru")));
 
   const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
   const teacherMap = new Map(teachers.map((t) => [t.id, t.fullName]));
 
   // Индекс уроков: classId__day__slot -> ScheduleLesson
   const lessonIndex = new Map<string, ScheduleLesson>();
   for (const l of lessons) {
     lessonIndex.set(`${l.classId}__${l.day}__${l.slot}`, l);
   }
 
   const wb = XLSX.utils.book_new();
 
   // Вариант 1: Столбцы - классы, строки - дни/уроки
   const sheet1Data: any[][] = [];
   const header1 = ["День", "Урок", ...sortedClasses.map((c) => `${c.grade}${c.letter}`)];
   sheet1Data.push(header1);
 
   for (const day of days) {
      for (const slot of slots) {
        // -1 отображаем только в днях, где он включён
        if (slot === -1 && !includeMinusByDay[day]) continue;

        const row: any[] = [day, slot === -1 ? "-1" : slot === 0 ? "0-й" : `${slot}-й`];
       for (const cls of sortedClasses) {
         const l = lessonIndex.get(`${cls.id}__${day}__${slot}`);
         if (l) {
           const subj = subjectMap.get(l.subjectId) || "";
           const teach = teacherMap.get(l.teacherId) || "";
           const room = l.room || "";
           row.push(`${subj}\n${teach}${room ? `\n${room}` : ""}`);
         } else {
           row.push("");
         }
       }
       sheet1Data.push(row);
     }
   }
 
   const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
   
   // Стиль заголовков
   const headerStyle = {
     font: { bold: true },
     alignment: { horizontal: "center", vertical: "center" },
     border: {
       top: { style: "thick" },
       bottom: { style: "thick" },
       left: { style: "thick" },
       right: { style: "thick" },
     },
   };
   
   for (let c = 0; c < header1.length; c++) {
     const cellRef = XLSX.utils.encode_cell({ r: 0, c });
     if (!ws1[cellRef]) continue;
     ws1[cellRef].s = headerStyle;
   }
 
   XLSX.utils.book_append_sheet(wb, ws1, "По классам (столбцы)");
 
   // Вариант 2: Столбцы - дни, строки - классы/уроки
   const sheet2Data: any[][] = [];
   const header2 = ["Класс", "Урок", ...days];
   sheet2Data.push(header2);
 
    for (const cls of sortedClasses) {
      for (const slot of slots) {
        const row: any[] = [`${cls.grade}${cls.letter}`, slot === -1 ? "-1" : slot === 0 ? "0-й" : `${slot}-й`];
       for (const day of days) {
          if (slot === -1 && !includeMinusByDay[day]) {
            row.push("");
            continue;
          }
         const l = lessonIndex.get(`${cls.id}__${day}__${slot}`);
         if (l) {
           const subj = subjectMap.get(l.subjectId) || "";
           const teach = teacherMap.get(l.teacherId) || "";
           const room = l.room || "";
           row.push(`${subj}\n${teach}${room ? `\n${room}` : ""}`);
         } else {
           row.push("");
         }
       }
       sheet2Data.push(row);
     }
   }
 
   const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
   
   for (let c = 0; c < header2.length; c++) {
     const cellRef = XLSX.utils.encode_cell({ r: 0, c });
     if (!ws2[cellRef]) continue;
     ws2[cellRef].s = headerStyle;
   }
 
   XLSX.utils.book_append_sheet(wb, ws2, "По дням (столбцы)");
 
   XLSX.writeFile(wb, "Расписание.xlsx");
 }