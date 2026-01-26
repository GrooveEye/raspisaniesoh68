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
    // Правило: 0-й урок — в последнюю очередь
    if (slot0Preferred && candidateSlot === 0) score -= 80;
    return score;
  }

  // Порядок размещения слотов:
  // 1) 1..6
  // 2) 7..N
  // 3) 0 — всегда в конце
  function orderSlotsForPlacement(allSlots: number[]) {
    const hasZero = allSlots.includes(0);
    const nonZero = allSlots.filter((s) => s !== 0);
    const first = nonZero.filter((s) => s >= 1 && s <= 6).sort((a, b) => a - b);
    const rest = nonZero.filter((s) => s < 1 || s > 6).sort((a, b) => a - b);
    return hasZero ? [...first, ...rest, 0] : [...first, ...rest];
  }

  function removeTeacherDaySlot(params: { map: Map<string, number[]>; teacherId: string; day: string; slot: number }) {
    const { map, teacherId, day, slot } = params;
    const key = `${teacherId}__${day}`;
    const prev = map.get(key) || [];
    const next = prev.filter((s) => s !== slot);
    if (next.length) map.set(key, next);
    else map.delete(key);
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
  /**
   * «Общие занятия» (например, внеурочка на всю параллель одновременно):
   * один слот у учителя, но отображается у нескольких классов.
   */
  sharedGroups?: Array<{
    id: string;
    teacherId: string;
    subjectId: string;
    classIds: string[];
    hoursPerWeek: number;
  }>;
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
    sharedGroups = [],
   } = params;

  const assignmentGroupKey = (params: {
    subjectId: string;
    isGroup?: boolean;
    groupNumber?: number;
  }) => {
    const g = params.isGroup ? Number(params.groupNumber || 0) : 0;
    return `${params.subjectId}__g${g}`;
  };
 
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
      if (a.subjectId) anchorIndex.set(`${a.classId}__${a.subjectId}`, a);
    }

    const isLessonAnchored = (l: ScheduleLesson) => anchorIndex.has(`${l.classId}__${l.subjectId}`);
 
   // Индекс учителей
   const teacherMap = new Map(teachers.map((t) => [t.id, t]));
 
    // Индекс занятости: день__слот -> Set<teacherId>
   const teacherOccupied = new Map<string, Set<string>>();
   // Индекс занятости кабинетов: день__слот -> Set<room>
   const roomOccupied = new Map<string, Set<string>>();

     // Для эвристики «окна/целый день»: teacherId__day -> slots[] (уникальные слоты)
     const teacherDaySlots = new Map<string, number[]>();

     const addTeacherDaySlot = (teacherId: string, day: string, slot: number) => {
       const key = `${teacherId}__${day}`;
       const prev = teacherDaySlots.get(key) || [];
       if (!prev.includes(slot)) teacherDaySlots.set(key, [...prev, slot]);
     };

      const removeOccupancy = (lesson: ScheduleLesson) => {
        const key = `${lesson.day}__${lesson.slot}`;
        const tSet = teacherOccupied.get(key);
        if (tSet) {
          tSet.delete(lesson.teacherId);
          if (tSet.size === 0) teacherOccupied.delete(key);
        }
        if (lesson.room) {
          const rSet = roomOccupied.get(key);
          if (rSet) {
            rSet.delete(lesson.room.toLowerCase());
            if (rSet.size === 0) roomOccupied.delete(key);
          }
        }
        removeTeacherDaySlot({ map: teacherDaySlots, teacherId: lesson.teacherId, day: lesson.day, slot: lesson.slot });
      };

      const addOccupancy = (lesson: ScheduleLesson) => {
        const key = `${lesson.day}__${lesson.slot}`;
        teacherOccupied.set(key, (teacherOccupied.get(key) || new Set()).add(lesson.teacherId));
        if (lesson.room) {
          roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(lesson.room.toLowerCase()));
        }
        addTeacherDaySlot(lesson.teacherId, lesson.day, lesson.slot);
      };

      const canPlaceLesson = (lesson: ScheduleLesson, day: string, slot: number, room: string) => {
        // Класс свободен
        const classHasLesson = lessons.some((l) => l.classId === lesson.classId && l.day === day && l.slot === slot);
        if (classHasLesson) return false;

        // Доступность учителя
        const available = teacherAvailability[lesson.teacherId]?.[day]?.[slot] ?? true;
        if (!available) return false;

        // Конфликт учителя
        const key = `${day}__${slot}`;
        const teachersInSlot = teacherOccupied.get(key) || new Set();
        if (teachersInSlot.has(lesson.teacherId)) return false;

        // Конфликт кабинета (если фиксированный)
        if (room) {
          const roomsInSlot = roomOccupied.get(key) || new Set();
          if (roomsInSlot.has(room.toLowerCase())) return false;
        }
        return true;
      };

      const relocateLesson = (lessonToMove: ScheduleLesson) => {
        // Закреплённые уроки не двигаем
        if (isLessonAnchored(lessonToMove)) return false;

        const teacher = teacherMap.get(lessonToMove.teacherId);
        const room = teacher?.primaryRoom || "";

        // Убираем текущую занятость на время поиска нового места
        removeOccupancy(lessonToMove);

        const candidates: Array<{ day: string; slot: number; score: number }> = [];

        for (const day of days) {
          const slotOrder = orderSlotsForPlacement(slots);

          for (const slot of slotOrder) {
            if (!canPlaceLesson(lessonToMove, day, slot, room)) continue;

            // Мягкое правило: не более 2 уроков одного предмета в день
            const sameSubjectCount = lessons.filter(
              (l) => l.classId === lessonToMove.classId && l.day === day && l.subjectId === lessonToMove.subjectId
            ).length;
            const subjectOk = sameSubjectCount < 2;

            const tdKey = `${lessonToMove.teacherId}__${day}`;
            const currentTeacherSlots = teacherDaySlots.get(tdKey) || [];
            let score = scoreCandidate({
              teacherDaySlots: currentTeacherSlots,
              candidateSlot: slot,
              slot0Preferred: isExtrSubject(lessonToMove.subjectId),
            });
            if (!subjectOk) score -= 60;

            candidates.push({ day, slot, score });
          }
        }

        candidates.sort((a, b) => b.score - a.score);

        const best = candidates[0];
        if (!best) {
          // Восстанавливаем исходную занятость
          addOccupancy(lessonToMove);
          return false;
        }

        // Перемещаем
        lessonToMove.day = best.day;
        lessonToMove.slot = best.slot;
        lessonToMove.room = room || undefined;
        addOccupancy(lessonToMove);
        return true;
      };
 
   // Индексируем существующие уроки
   for (const l of lessons) {
     const key = `${l.day}__${l.slot}`;
     teacherOccupied.set(key, (teacherOccupied.get(key) || new Set()).add(l.teacherId));
     if (l.room) {
       roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(l.room.toLowerCase()));
     }

       addTeacherDaySlot(l.teacherId, l.day, l.slot);
   }

    // Сначала размещаем «общие занятия» (внеурочка на несколько классов одновременно)
    for (const g of sharedGroups) {
      const needed = Math.max(0, Number(g.hoursPerWeek) || 0);
      if (needed <= 0) continue;
      if (!g.classIds.length) continue;

      // Если есть закрепления по этой внеурочке хотя бы у одного класса — требуем единый слот
      const gAnchors = g.classIds
        .map((classId) => anchorIndex.get(`${classId}__${g.subjectId}`))
        .filter(Boolean) as ScheduleAnchor[];

      const uniqueAnchorKey = new Set(gAnchors.map((a) => `${a.day}__${a.slot}`));
      if (uniqueAnchorKey.size > 1) {
        conflicts.push(
           `Внеурочная деятельность (${g.subjectId}): закрепления у разных классов указывают на разные слоты — невозможно объединить в группу`
        );
        continue;
      }

      const forcedAnchor = gAnchors[0];

      const teacher = teacherMap.get(g.teacherId);
      const room = teacher?.primaryRoom || "";

      let placed = 0;
      for (const day of days) {
        if (placed >= needed) break;
        if (forcedAnchor && forcedAnchor.day !== day) continue;

        const slotOrder = orderSlotsForPlacement(slots);

        const candidates: { slot: number; score: number }[] = [];
        for (const slot of slotOrder) {
          if (placed >= needed) break;
          if (forcedAnchor && forcedAnchor.slot !== slot) continue;

          // все классы должны быть свободны в этом слоте
          const classesFree = g.classIds.every(
            (classId) => !lessons.some((l) => l.classId === classId && l.day === day && l.slot === slot)
          );
          if (!classesFree) continue;

          // доступность учителя
          const available = teacherAvailability[g.teacherId]?.[day]?.[slot] ?? true;
          if (!available) continue;

          // конфликт учителя
          const key = `${day}__${slot}`;
          const teachersInSlot = teacherOccupied.get(key) || new Set();
          if (teachersInSlot.has(g.teacherId)) continue;

          // конфликт кабинета (если кабинет фиксированный)
          if (room) {
            const roomsInSlot = roomOccupied.get(key) || new Set();
            if (roomsInSlot.has(room.toLowerCase())) continue;
          }

          const tdKey = `${g.teacherId}__${day}`;
          const currentTeacherSlots = teacherDaySlots.get(tdKey) || [];
          const score = scoreCandidate({
            teacherDaySlots: currentTeacherSlots,
            candidateSlot: slot,
            slot0Preferred: isExtrSubject(g.subjectId),
          });
          candidates.push({ slot, score });
        }

        candidates.sort((a, b) => b.score - a.score);

        for (const cand of candidates) {
          if (placed >= needed) break;
          const slot = cand.slot;
          const key = `${day}__${slot}`;

          // повторная проверка, что все классы свободны
          const classesFree = g.classIds.every(
            (classId) => !lessons.some((l) => l.classId === classId && l.day === day && l.slot === slot)
          );
          if (!classesFree) continue;

          const available = teacherAvailability[g.teacherId]?.[day]?.[slot] ?? true;
          if (!available) continue;

          const teachersInSlot = teacherOccupied.get(key) || new Set();
          if (teachersInSlot.has(g.teacherId)) continue;

          if (room) {
            const roomsInSlot = roomOccupied.get(key) || new Set();
            if (roomsInSlot.has(room.toLowerCase())) continue;
          }

          const sharedGroupId = `${g.id}__${placed + 1}`;
          for (const classId of g.classIds) {
            lessons.push({
              id: crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
              classId,
              day,
              slot,
              subjectId: g.subjectId,
              teacherId: g.teacherId,
              room: room || undefined,
              sharedGroupId,
            });
          }

          teacherOccupied.set(key, teachersInSlot.add(g.teacherId));
          addTeacherDaySlot(g.teacherId, day, slot);
          if (room) {
            roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(room.toLowerCase()));
          }

          placed++;
        }
      }

      if (placed < needed) {
        conflicts.push(
          `Внеурочная деятельность (${g.subjectId}): не удалось разместить ${needed - placed} урок(ов) для общей группы`
        );
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
        if (existing) {
          // Если слот занят незакреплённым уроком — пытаемся переставить его
          const moved = relocateLesson(existing);
          if (!moved) {
            conflicts.push(
              `${cls.grade}${cls.letter}: ${anchor.day} ${anchor.slot}-й — слот закрепления занят и не удалось освободить`
            );
            continue;
          }
        }
 
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
        addTeacherDaySlot(a.teacherId, anchor.day, anchor.slot);
        if (room) roomOccupied.set(key, (roomOccupied.get(key) || new Set()).add(room.toLowerCase()));
     }
 
     // Затем распределяем незакреплённые
     for (const a of assignments) {
       const anchor = anchorIndex.get(`${cls.id}__${a.subjectId}`);
       if (anchor) continue; // уже обработано
 
       // Сколько уроков этого предмета уже есть у класса?
        // ВАЖНО: при делении на группы часы считаются отдельно по каждой группе.
        const aKey = assignmentGroupKey({
          subjectId: a.subjectId,
          isGroup: a.isGroup,
          groupNumber: a.groupNumber,
        });
        const existing = lessons.filter((l) => {
          if (l.classId !== cls.id) return false;
          return (
            assignmentGroupKey({
              subjectId: l.subjectId,
              isGroup: l.isGroup,
              groupNumber: l.groupNumber,
            }) === aKey
          );
        });
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

          const slotOrder = orderSlotsForPlacement(slots);

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
            addTeacherDaySlot(a.teacherId, day, slot);
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