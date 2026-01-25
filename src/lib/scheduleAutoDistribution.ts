 import type {
   LoadAssignment,
   ScheduleLesson,
   ScheduleAnchor,
   SchoolClass,
   Teacher,
   TeacherAvailability,
   WeekGrid,
   Room,
 } from "@/types";
 
 export interface AutoDistributionResult {
   lessons: ScheduleLesson[];
   conflicts: string[];
 }
 
 /**
  * Автоматическое распределение расписания на основе:
  * - Распределения нагрузки (loadAssignments)
  * - Закреплений (anchors)
  * - Доступности учителей (teacherAvailability)
  * - Сетки недели (weekGrid)
  * - Кабинетов (rooms) и привязок учителей
  */
 export function autoDistributeSchedule(params: {
   classes: SchoolClass[];
   loadAssignments: LoadAssignment[];
   teachers: Teacher[];
   rooms: Room[];
   anchors: ScheduleAnchor[];
   weekGrid: WeekGrid;
   teacherAvailability: TeacherAvailability;
   existingLessons?: ScheduleLesson[];
 }): AutoDistributionResult {
   const {
     classes,
     loadAssignments,
     teachers,
     rooms,
     anchors,
     weekGrid,
     teacherAvailability,
     existingLessons = [],
   } = params;
 
   const lessons: ScheduleLesson[] = [...existingLessons];
   const conflicts: string[] = [];
 
   // Дни недели
   const days =
     weekGrid.weekType === 6
       ? ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
       : ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
 
   // Слоты
   const slotsStart = weekGrid.includeZeroLesson ? 0 : 1;
   const slotsEnd = weekGrid.slotsPerDay;
   const slots: number[] = [];
   for (let s = slotsStart; s <= slotsEnd; s++) slots.push(s);
 
   // Индекс закреплений: classId__subjectId -> anchor
   const anchorIndex = new Map<string, ScheduleAnchor>();
   for (const a of anchors) {
     if (a.subjectId) {
       anchorIndex.set(`${a.classId}__${a.subjectId}`, a);
     }
   }
 
   // Индекс учителей
   const teacherMap = new Map(teachers.map((t) => [t.id, t]));
 
   // Индекс занятости: день__слот -> Set<teacherId>
   const teacherOccupied = new Map<string, Set<string>>();
   // Индекс занятости кабинетов: день__слот -> Set<room>
   const roomOccupied = new Map<string, Set<string>>();
 
   // Индексируем существующие уроки
   for (const l of lessons) {
     const key = `${l.day}__${l.slot}`;
     teacherOccupied.set(key, (teacherOccupied.get(key) || new Set()).add(l.teacherId));
     if (l.room) {
       roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(l.room.toLowerCase()));
     }
   }
 
   // Группируем задания по классам
   const assignmentsByClass = new Map<string, LoadAssignment[]>();
   for (const a of loadAssignments) {
     assignmentsByClass.set(a.classId, [...(assignmentsByClass.get(a.classId) || []), a]);
   }
 
   // Для каждого класса распределяем уроки
   for (const cls of classes) {
     const assignments = assignmentsByClass.get(cls.id) || [];
 
     // Сначала распределяем закреплённые
     for (const a of assignments) {
       const anchor = anchorIndex.get(`${cls.id}__${a.subjectId}`);
       if (!anchor) continue;
 
       // Проверяем, есть ли уже урок в этом слоте
       const existing = lessons.find(
         (l) => l.classId === cls.id && l.day === anchor.day && l.slot === anchor.slot
       );
       if (existing) continue;
 
       const teacher = teacherMap.get(a.teacherId);
       const room = teacher?.primaryRoom || "";
 
       // Проверяем доступность учителя
       const available = teacherAvailability[a.teacherId]?.[anchor.day]?.[anchor.slot] ?? true;
       if (!available) {
         conflicts.push(
           `${cls.grade}${cls.letter}: ${anchor.day} ${anchor.slot}-й — учитель недоступен (закрепление)`
         );
         continue;
       }
 
       // Проверяем конфликты
       const key = `${anchor.day}__${anchor.slot}`;
       const teachersInSlot = teacherOccupied.get(key) || new Set();
       if (teachersInSlot.has(a.teacherId)) {
         conflicts.push(
           `${cls.grade}${cls.letter}: ${anchor.day} ${anchor.slot}-й — учитель занят (закрепление)`
         );
         continue;
       }
 
       // Добавляем урок
       const lesson: ScheduleLesson = {
         id: crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
         classId: cls.id,
         day: anchor.day,
         slot: anchor.slot,
         subjectId: a.subjectId,
         teacherId: a.teacherId,
         room: room || undefined,
         isGroup: a.isGroup,
         groupNumber: a.groupNumber,
       };
       lessons.push(lesson);
       teacherOccupied.set(key, teachersInSlot.add(a.teacherId));
       if (room) {
         roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(room.toLowerCase()));
       }
     }
 
     // Затем распределяем незакреплённые
     for (const a of assignments) {
       const anchor = anchorIndex.get(`${cls.id}__${a.subjectId}`);
       if (anchor) continue; // уже обработано
 
       // Сколько уроков этого предмета уже есть у класса?
       const existing = lessons.filter((l) => l.classId === cls.id && l.subjectId === a.subjectId);
       const needed = a.hoursPerWeek - existing.length;
 
       if (needed <= 0) continue;
 
       const teacher = teacherMap.get(a.teacherId);
       const room = teacher?.primaryRoom || "";
 
       // Ищем свободные слоты для этого класса
       let placed = 0;
       for (const day of days) {
         for (const slot of slots) {
           if (placed >= needed) break;
 
           // Проверяем, есть ли уже урок у класса в этом слоте
           const classHasLesson = lessons.some(
             (l) => l.classId === cls.id && l.day === day && l.slot === slot
           );
           if (classHasLesson) continue;
 
           // Проверяем доступность учителя
           const available = teacherAvailability[a.teacherId]?.[day]?.[slot] ?? true;
           if (!available) continue;
 
           // Проверяем конфликты учителя
           const key = `${day}__${slot}`;
           const teachersInSlot = teacherOccupied.get(key) || new Set();
           if (teachersInSlot.has(a.teacherId)) continue;
 
           // Добавляем урок
           const lesson: ScheduleLesson = {
             id: crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
             classId: cls.id,
             day,
             slot,
             subjectId: a.subjectId,
             teacherId: a.teacherId,
             room: room || undefined,
             isGroup: a.isGroup,
             groupNumber: a.groupNumber,
           };
           lessons.push(lesson);
           teacherOccupied.set(key, teachersInSlot.add(a.teacherId));
           if (room) {
             roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(room.toLowerCase()));
           }
           placed++;
         }
         if (placed >= needed) break;
       }
 
       if (placed < needed) {
         conflicts.push(
           `${cls.grade}${cls.letter}: не удалось разместить ${needed - placed} урок(ов) по предмету (${a.subjectId})`
         );
       }
     }
   }
 
   return { lessons, conflicts };
 }