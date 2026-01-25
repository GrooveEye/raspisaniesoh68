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

  const EXTR_PREFIX = "extr_";

  function isExtrSubject(subjectId: string) {
    return subjectId.startsWith(EXTR_PREFIX);
  }

  function countTeacherWindows(params: { slots: number[] }) {
    const { slots } = params;
    if (slots.length <= 1) return 0;
    const sorted = [...slots].sort((a, b) => a - b);
    let windows = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      windows += Math.max(0, sorted[i + 1] - sorted[i] - 1);
    }
    return windows;
  }

  function scoreCandidate(params: {
    teacherDaySlots: number[];
    candidateSlot: number;
    slot0Preferred: boolean;
  }) {
    const { teacherDaySlots, candidateSlot, slot0Preferred } = params;

    const nextSlots = [...teacherDaySlots, candidateSlot];
    const sorted = nextSlots.sort((a, b) => a - b);
    const windows = countTeacherWindows({ slots: sorted });

    // Бонус за «прилипание» к блоку уроков (уплотнение дня)
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const adjacent = teacherDaySlots.some((s) => Math.abs(s - candidateSlot) === 1);

    let score = 0;
    score -= windows * 100; // главное: не делать окна
    if (adjacent) score += 15;
    // Небольшой бонус за более плотный диапазон (приближаем к «целому дню»)
    score -= (max - min) * 2;
    if (slot0Preferred && candidateSlot === 0) score += 40;
    return score;
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

    // Для эвристики «окна/целый день»: teacherId__day -> slots[]
    const teacherDaySlots = new Map<string, number[]>();
 
   // Индексируем существующие уроки
   for (const l of lessons) {
     const key = `${l.day}__${l.slot}`;
     teacherOccupied.set(key, (teacherOccupied.get(key) || new Set()).add(l.teacherId));
     if (l.room) {
       roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(l.room.toLowerCase()));
     }

      const tdKey = `${l.teacherId}__${l.day}`;
      teacherDaySlots.set(tdKey, [...(teacherDaySlots.get(tdKey) || []), l.slot]);
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
        teacherDaySlots.set(
          `${a.teacherId}__${anchor.day}`,
          [...(teacherDaySlots.get(`${a.teacherId}__${anchor.day}`) || []), anchor.slot]
        );
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
          if (placed >= needed) break;

          // Собираем кандидаты по дню и выбираем лучший по эвристике
          const candidates: { slot: number; score: number }[] = [];

          // Для внеурочки предпочитаем 0-й урок
          const slotOrder = isExtrSubject(a.subjectId)
            ? [...slots].sort((x, y) => (x === 0 ? -1 : y === 0 ? 1 : x - y))
            : slots;

          for (const slot of slotOrder) {
            if (placed >= needed) break;

            // Проверяем, есть ли уже урок у класса в этом слоте
            const classHasLesson = lessons.some(
              (l) => l.classId === cls.id && l.day === day && l.slot === slot
            );
            if (classHasLesson) continue;

            // Правило: одному классу один предмет не более 2 раз в день (мягкое ограничение)
            const sameSubjectCount = lessons.filter(
              (l) => l.classId === cls.id && l.day === day && l.subjectId === a.subjectId
            ).length;
            const subjectOk = sameSubjectCount < 2;

            // Проверяем доступность учителя
            const available = teacherAvailability[a.teacherId]?.[day]?.[slot] ?? true;
            if (!available) continue;

            // Проверяем конфликты учителя
            const key = `${day}__${slot}`;
            const teachersInSlot = teacherOccupied.get(key) || new Set();
            if (teachersInSlot.has(a.teacherId)) continue;

            const tdKey = `${a.teacherId}__${day}`;
            const currentTeacherSlots = teacherDaySlots.get(tdKey) || [];
            let score = scoreCandidate({
              teacherDaySlots: currentTeacherSlots,
              candidateSlot: slot,
              slot0Preferred: isExtrSubject(a.subjectId),
            });
            if (!subjectOk) score -= 60;

            candidates.push({ slot, score });
          }

          candidates.sort((x, y) => y.score - x.score);

          for (const cand of candidates) {
            if (placed >= needed) break;
            const slot = cand.slot;

            // Повторные проверки (на случай изменений в процессе размещения)
            const classHasLesson = lessons.some(
              (l) => l.classId === cls.id && l.day === day && l.slot === slot
            );
            if (classHasLesson) continue;
            const available = teacherAvailability[a.teacherId]?.[day]?.[slot] ?? true;
            if (!available) continue;
            const key = `${day}__${slot}`;
            const teachersInSlot = teacherOccupied.get(key) || new Set();
            if (teachersInSlot.has(a.teacherId)) continue;

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
            const tdKey = `${a.teacherId}__${day}`;
            teacherDaySlots.set(tdKey, [...(teacherDaySlots.get(tdKey) || []), slot]);
            if (room) {
              roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(room.toLowerCase()));
            }
            placed++;
          }
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