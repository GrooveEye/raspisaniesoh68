import { useEffect, useMemo, useState } from "react";
 import { useApp } from "@/context/AppContext";
 import { Button } from "@/components/ui/button";
 import { Download, Sparkles, Filter } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
 import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 import { Badge } from "@/components/ui/badge";
 import type { ScheduleLesson } from "@/types";
 import { getScheduleIssues } from "@/pages/schedule/scheduleUtils";
 import { ScheduleEditorDialog } from "@/pages/schedule/ScheduleEditorDialog";
 import { ScheduleWeekSettingsDialog } from "@/pages/schedule/ScheduleWeekSettingsDialog";
 import { ScheduleGridByDays } from "@/pages/schedule/ScheduleGridByDays";
 import { ScheduleGridBySlots } from "@/pages/schedule/ScheduleGridBySlots";
 import { autoDistributeSchedule } from "@/lib/scheduleAutoDistribution";
 import { exportScheduleToExcel } from "@/lib/scheduleExport";
 import { toast } from "@/components/ui/use-toast";
import {
  buildExtracurricularLoadAssignments,
  buildExtracurricularSubjects,
  EXTRACURRICULAR_SUBJECT_PREFIX,
  type ExtracurricularHoursByAssignment,
} from "@/lib/schedule/extracurricularAsSubjects";

  const SCHEDULABLE_EXTRACURRICULAR_NAMES = [
    "Разговоры о важном",
    "Россия - мои горизонты",
    "Россия — мои горизонты",
    "Россия – мои горизонты",
  ];

  function normalizeName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/[—–]/g, "-")
      .replace(/\s+/g, " ");
  }
 
 function classLabel(grade: number, letter: string) {
   return `${grade}${letter}`;
 }
 
 export default function Schedule() {
   const {
     classes,
     subjects,
     teachers,
     rooms,
     extracurriculars,
     loadAssignments,
      extracurricularAssignments,
     weekGrid,
     teacherAvailability,
     scheduleLessons,
     scheduleAnchors,
     setWeekGrid,
    setScheduleLessons,
     upsertScheduleLesson,
     deleteScheduleLesson,
     setTeacherAvailabilityCell,
     upsertScheduleAnchor,
     deleteScheduleAnchor,
     deleteScheduleAnchorFor,
   } = useApp();
 
   const days = useMemo(() => {
     const base = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
     return weekGrid.weekType === 6 ? [...base, "Суббота"] : base;
   }, [weekGrid.weekType]);
 
   const slots = useMemo(() => {
     const start = weekGrid.includeZeroLesson ? 0 : 1;
     const end = weekGrid.slotsPerDay;
     const arr: number[] = [];
     for (let s = start; s <= end; s++) arr.push(s);
     return arr;
   }, [weekGrid.includeZeroLesson, weekGrid.slotsPerDay]);
 
   const sortedClasses = useMemo(() => {
     return classes
       .slice()
       .sort((a, b) => (a.grade !== b.grade ? a.grade - b.grade : a.letter.localeCompare(b.letter, "ru")));
   }, [classes]);
 
   const [editorOpen, setEditorOpen] = useState(false);
   const [weekOpen, setWeekOpen] = useState(false);
   const [autoDistributeOpen, setAutoDistributeOpen] = useState(false);
   const [visibleClassIds, setVisibleClassIds] = useState<Set<string>>(
     new Set(sortedClasses.map((c) => c.id))
   );
   const [editorDefaults, setEditorDefaults] = useState<{
     classId: string;
     day: string;
     slot: number;
     existing?: ScheduleLesson;
     issues?: string[];
   } | null>(null);

  // Конфликты автораспределения (например: «не удалось разместить N урок(ов)…»).
  // Это не конфликты слотов, поэтому они не попадают в getScheduleIssues.
  const [autoDistributionConflicts, setAutoDistributionConflicts] = useState<string[]>([]);
 
   const { byLessonId } = useMemo(() => {
     return getScheduleIssues({
       lessons: scheduleLessons,
       availability: teacherAvailability,
       anchors: scheduleAnchors,
     });
   }, [scheduleLessons, teacherAvailability, scheduleAnchors]);
 
   const issuesByLessonId = byLessonId;

  const totalErrorsCount = byLessonId.size + autoDistributionConflicts.length;
 
   const filteredClasses = useMemo(() => {
     return sortedClasses.filter((c) => visibleClassIds.has(c.id));
   }, [sortedClasses, visibleClassIds]);
 
   const openEditor = (classId: string, day: string, slot: number) => {
     const existing = scheduleLessons.find((l) => l.classId === classId && l.day === day && l.slot === slot);
     const issues = existing ? (issuesByLessonId.get(existing.id) || []).map((i) => i.message) : [];
     setEditorDefaults({ classId, day, slot, existing, issues });
     setEditorOpen(true);
   };
 
   const toggleClassVisibility = (classId: string) => {
     setVisibleClassIds((prev) => {
       const next = new Set(prev);
       if (next.has(classId)) {
         next.delete(classId);
       } else {
         next.add(classId);
       }
       return next;
     });
   };
 
   const toggleAllClasses = () => {
     if (visibleClassIds.size === sortedClasses.length) {
       setVisibleClassIds(new Set());
     } else {
       setVisibleClassIds(new Set(sortedClasses.map((c) => c.id)));
     }
   };
 
   const [availabilityTeacherId, setAvailabilityTeacherId] = useState<string>(teachers[0]?.id || "");
 
   const sortedAnchors = useMemo(() => {
     return scheduleAnchors
       .slice()
       .sort((a, b) => {
         const ca = classes.find((c) => c.id === a.classId);
         const cb = classes.find((c) => c.id === b.classId);
         const cla = ca ? `${ca.grade}${ca.letter}` : "";
         const clb = cb ? `${cb.grade}${cb.letter}` : "";
         if (cla !== clb) return cla.localeCompare(clb, "ru");
 
         const ta = a.subjectId
           ? `Предмет: ${subjects.find((s) => s.id === a.subjectId)?.name || "?"}`
           : `Внеурочная деятельность: ${extracurriculars.find((e) => e.id === a.extracurricularId)?.name || "?"}`;
         const tb = b.subjectId
           ? `Предмет: ${subjects.find((s) => s.id === b.subjectId)?.name || "?"}`
           : `Внеурочная деятельность: ${extracurriculars.find((e) => e.id === b.extracurricularId)?.name || "?"}`;
         if (ta !== tb) return ta.localeCompare(tb, "ru");
 
         if (a.day !== b.day) return a.day.localeCompare(b.day, "ru");
         return a.slot - b.slot;
       });
   }, [scheduleAnchors, classes, subjects, extracurriculars]);

     const schedulableExtracurriculars = useMemo(() => {
       const allowed = new Set(SCHEDULABLE_EXTRACURRICULAR_NAMES.map(normalizeName));
       return extracurriculars.filter((e) => allowed.has(normalizeName(e.name)));
     }, [extracurriculars]);

     const schedulableExtracurricularIds = useMemo(
       () => new Set(schedulableExtracurriculars.map((e) => e.id)),
       [schedulableExtracurriculars]
     );

     const schedulableExtracurricularAssignments = useMemo(
       () => extracurricularAssignments.filter((a) => schedulableExtracurricularIds.has(a.extracurricularId)),
       [extracurricularAssignments, schedulableExtracurricularIds]
     );

      // Внеурочка «ведёт классный руководитель» не имеет ручных назначений —
      // её часы должны автоматически привязываться к классному руководителю конкретного класса.
      const classTeacherLedSchedulableExtracurriculars = useMemo(() => {
        return schedulableExtracurriculars.filter((e) => e.isClassTeacherLed);
      }, [schedulableExtracurriculars]);

      const classTeacherLedLoadAssignments = useMemo(() => {
        return classTeacherLedSchedulableExtracurriculars.flatMap((course) => {
          return classes
            .filter((c) => course.targetGrades.includes(c.grade))
            .filter((c) => Boolean(c.classTeacherId))
            .map((c) => {
              return {
                id: crypto.randomUUID(),
                teacherId: c.classTeacherId as string,
                classId: c.id,
                subjectId: `${EXTRACURRICULAR_SUBJECT_PREFIX}${course.id}`,
                hoursPerWeek: course.hoursPerWeek,
                isGroup: false,
              };
            });
        });
      }, [classTeacherLedSchedulableExtracurriculars, classes]);

     const extracurricularSubjects = useMemo(
       () => buildExtracurricularSubjects(schedulableExtracurriculars),
       [schedulableExtracurriculars]
     );

    const combinedSubjects = useMemo(
      () => [...subjects, ...extracurricularSubjects],
      [subjects, extracurricularSubjects]
    );

    // Ручное распределение часов внеурочки по классам (перед запуском автораспределения)
    const [extracurricularHours, setExtracurricularHours] = useState<ExtracurricularHoursByAssignment>({});

    // Режим внеурочки:
    // - split: часы распределяются по классам (сумма = hoursPerWeek)
    // - parallel: одно занятие идёт одновременно на несколько классов (hoursPerWeek = часов у учителя)
    const [extracurricularMode, setExtracurricularMode] = useState<Record<string, "split" | "parallel">>({});
    const [extracurricularParallelClasses, setExtracurricularParallelClasses] = useState<
      Record<string, Record<string, boolean>>
    >({});

     useEffect(() => {
      if (!autoDistributeOpen) return;
      // Инициализируем структуру, чтобы inputs были контролируемыми
      setExtracurricularHours((prev) => {
        const next: ExtracurricularHoursByAssignment = { ...prev };
         for (const a of schedulableExtracurricularAssignments) {
          if (!next[a.id]) next[a.id] = {};
          const targetClasses = sortedClasses.filter((c) => a.targetGrades.includes(c.grade));
          for (const c of targetClasses) {
            if (next[a.id][c.id] === undefined) next[a.id][c.id] = 0;
          }
        }
        return next;
      });

      setExtracurricularMode((prev) => {
        const next = { ...prev };
         for (const a of schedulableExtracurricularAssignments) {
          if (!next[a.id]) next[a.id] = "split";
        }
        return next;
      });

      setExtracurricularParallelClasses((prev) => {
        const next = { ...prev };
         for (const a of schedulableExtracurricularAssignments) {
          const targetClasses = sortedClasses.filter((c) => a.targetGrades.includes(c.grade));
          if (!next[a.id]) next[a.id] = {};
          for (const c of targetClasses) {
            if (next[a.id][c.id] === undefined) next[a.id][c.id] = true;
          }
        }
        return next;
      });
     }, [autoDistributeOpen, schedulableExtracurricularAssignments, sortedClasses]);

    const extracurricularValidation = useMemo(() => {
      const byId = new Map<
        string,
        {
          total: number;
          sum: number;
          ok: boolean;
          targetClassIds: string[];
          mode: "split" | "parallel";
          parallelSelectedCount: number;
        }
      >();

       for (const a of schedulableExtracurricularAssignments) {
        const targetClassIds = sortedClasses
          .filter((c) => a.targetGrades.includes(c.grade))
          .map((c) => c.id);
        const mode = extracurricularMode[a.id] || "split";
        const sum =
          mode === "split"
            ? targetClassIds.reduce((acc, classId) => {
                const v = extracurricularHours[a.id]?.[classId] ?? 0;
                return acc + (Number(v) || 0);
              }, 0)
            : 0;

        const parallelSelectedCount =
          mode === "parallel"
            ? targetClassIds.filter((classId) => extracurricularParallelClasses[a.id]?.[classId]).length
            : 0;
        const total = a.hoursPerWeek;
        byId.set(a.id, {
          total,
          sum,
          ok: mode === "split" ? total === sum : parallelSelectedCount > 0,
          targetClassIds,
          mode,
          parallelSelectedCount,
        });
      }

      const allOk = Array.from(byId.values()).every((x) => x.ok);
      return { byId, allOk };
     }, [schedulableExtracurricularAssignments, extracurricularHours, extracurricularMode, extracurricularParallelClasses, sortedClasses]);
 
     const handleAutoDistribute = () => {
         const splitAssignments = schedulableExtracurricularAssignments.filter(
          (a) => (extracurricularMode[a.id] || "split") === "split"
        );

        const extracurricularLoad = buildExtracurricularLoadAssignments({
          extracurricularAssignments: splitAssignments,
          classes,
          hoursByAssignment: extracurricularHours,
        });

         const sharedGroups = schedulableExtracurricularAssignments
          .filter((a) => (extracurricularMode[a.id] || "split") === "parallel")
          .map((a) => {
            const targetClassIds = sortedClasses
              .filter((c) => a.targetGrades.includes(c.grade))
              .map((c) => c.id)
              .filter((classId) => Boolean(extracurricularParallelClasses[a.id]?.[classId]));

            return {
              id: `extr_parallel__${a.id}`,
              teacherId: a.teacherId,
              subjectId: `${EXTRACURRICULAR_SUBJECT_PREFIX}${a.extracurricularId}`,
              classIds: targetClassIds,
              hoursPerWeek: a.hoursPerWeek,
            };
          })
          .filter((g) => g.classIds.length > 0);

        const mergedAssignments = [...loadAssignments, ...extracurricularLoad, ...classTeacherLedLoadAssignments];

       // Превращаем закрепления внеурочки в «закрепления псевдо‑предметов»
       const mergedAnchors = scheduleAnchors
         .map((a) => {
           if (a.subjectId) return a;
           if (a.extracurricularId) {
             return {
               ...a,
               subjectId: `${EXTRACURRICULAR_SUBJECT_PREFIX}${a.extracurricularId}`,
             };
           }
           return null;
         })
         .filter(Boolean);

       const result = autoDistributeSchedule({
         classes,
         loadAssignments: mergedAssignments,
         teachers,
         rooms,
         anchors: mergedAnchors as any,
         weekGrid,
         teacherAvailability,
         existingLessons: [],
          sharedGroups,
       });

       setScheduleLessons(result.lessons);
      setAutoDistributionConflicts(result.conflicts);
 
     setAutoDistributeOpen(false);
     toast({
       title: "Автораспределение завершено",
       description: result.conflicts.length
         ? `Создано ${result.lessons.length} уроков. Конфликтов: ${result.conflicts.length}`
         : `Создано ${result.lessons.length} уроков без конфликтов`,
     });
   };
 
   const handleExport = () => {
     exportScheduleToExcel({
       lessons: scheduleLessons,
       classes,
        subjects: combinedSubjects,
       teachers,
       weekGrid,
     });
     toast({ title: "Расписание экспортировано", description: "Файл Расписание.xlsx загружен" });
   };
 
   return (
     <div className="space-y-6">
       <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
         <div>
           <h1 className="text-3xl font-bold">Расписание</h1>
           <p className="text-muted-foreground mt-1">Составление расписания по классам на основе распределения нагрузки</p>
         </div>
 
         <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-wrap">
           <Button variant="default" onClick={() => setAutoDistributeOpen(true)}>
             <Sparkles className="w-4 h-4 mr-2" />
             Автораспределение
           </Button>
           <Button variant="secondary" onClick={handleExport}>
             <Download className="w-4 h-4 mr-2" />
             Экспорт
           </Button>
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline">
                 <Filter className="w-4 h-4 mr-2" />
                 Классы ({visibleClassIds.size}/{sortedClasses.length})
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="w-56">
               <DropdownMenuLabel>Показать классы</DropdownMenuLabel>
               <DropdownMenuSeparator />
               <DropdownMenuCheckboxItem checked={visibleClassIds.size === sortedClasses.length} onCheckedChange={toggleAllClasses}>
                 Все классы
               </DropdownMenuCheckboxItem>
               <DropdownMenuSeparator />
               {sortedClasses.map((c) => (
                 <DropdownMenuCheckboxItem
                   key={c.id}
                   checked={visibleClassIds.has(c.id)}
                   onCheckedChange={() => toggleClassVisibility(c.id)}
                 >
                   {classLabel(c.grade, c.letter)}
                 </DropdownMenuCheckboxItem>
               ))}
             </DropdownMenuContent>
           </DropdownMenu>
           <Button variant="secondary" onClick={() => setWeekOpen(true)}>
             Сетка недели
           </Button>
         </div>
       </header>
 
       <Tabs defaultValue="schedule">
         <TabsList>
           <TabsTrigger value="schedule">Расписание (по дням)</TabsTrigger>
            <TabsTrigger value="schedule-alt">Расписание (по классам)</TabsTrigger>
           <TabsTrigger value="errors">
              Ошибки {totalErrorsCount > 0 ? `(${totalErrorsCount})` : ""}
           </TabsTrigger>
           <TabsTrigger value="availability">Доступность</TabsTrigger>
           <TabsTrigger value="anchors">Закрепления</TabsTrigger>
         </TabsList>
 
         <TabsContent value="schedule" className="space-y-4">
           {sortedClasses.length === 0 ? (
             <Card>
               <CardHeader>
                 <CardTitle>Нет классов</CardTitle>
               </CardHeader>
               <CardContent className="text-muted-foreground">Сначала создайте классы в справочнике.</CardContent>
             </Card>
           ) : (
             <ScheduleGridByDays
               days={days}
               slots={slots}
               classes={filteredClasses}
               lessons={scheduleLessons}
                subjects={combinedSubjects}
               teachers={teachers}
               issuesByLessonId={issuesByLessonId}
               onCellClick={openEditor}
             />
           )}
         </TabsContent>
 
         <TabsContent value="schedule-alt" className="space-y-4">
           {sortedClasses.length === 0 ? (
             <Card>
               <CardHeader>
                 <CardTitle>Нет классов</CardTitle>
               </CardHeader>
               <CardContent className="text-muted-foreground">Сначала создайте классы в справочнике.</CardContent>
             </Card>
           ) : (
             <ScheduleGridBySlots
               days={days}
               slots={slots}
               classes={filteredClasses}
               lessons={scheduleLessons}
                subjects={combinedSubjects}
               teachers={teachers}
               issuesByLessonId={issuesByLessonId}
               onCellClick={openEditor}
             />
           )}
         </TabsContent>
 
         <TabsContent value="errors" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle>Ошибки и конфликты в расписании</CardTitle>
             </CardHeader>
             <CardContent>
                {totalErrorsCount === 0 ? (
                 <div className="text-sm text-muted-foreground">
                   Конфликтов не найдено. Расписание составлено корректно.
                 </div>
               ) : (
                  <div className="space-y-6">
                    {autoDistributionConflicts.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium">Недостаточно слотов для размещения</div>
                        <div className="text-sm text-muted-foreground">
                          Эти сообщения появляются, когда по некоторым назначениям не удалось поставить нужное количество
                          уроков (часов) — даже если прямых конфликтов учителя/кабинета в сетке нет.
                        </div>

                        <div className="space-y-2">
                          {autoDistributionConflicts.map((msg, idx) => (
                            <div key={`${idx}-${msg}`} className="rounded-md border p-3">
                              <Badge variant="destructive">Не размещено</Badge>
                              <div className="mt-2 text-sm">{msg}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {byLessonId.size > 0 && (
                      <div className="space-y-3">
                        <div className="font-medium">Конфликты слотов (учитель/кабинет/закрепления)</div>
                        {Array.from(byLessonId.entries()).map(([lessonId, issues]) => {
                          const lesson = scheduleLessons.find((l) => l.id === lessonId);
                          if (!lesson) return null;
                          const cls = classes.find((c) => c.id === lesson.classId);
                          const subj = combinedSubjects.find((s) => s.id === lesson.subjectId);
                          const teach = teachers.find((t) => t.id === lesson.teacherId);
                          return (
                            <div key={lessonId} className="rounded-md border p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">
                                  {cls ? `${cls.grade}${cls.letter}` : "?"} — {lesson.day}, {lesson.slot === 0 ? "0-й" : `${lesson.slot}-й`}
                                </div>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openEditor(lesson.classId, lesson.day, lesson.slot)}
                                >
                                  Редактировать
                                </Button>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {subj?.name || "?"} — {teach?.fullName || "?"}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {issues.map((issue, idx) => (
                                  <Badge key={idx} variant="destructive">
                                    {issue.message}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>
 
         <TabsContent value="availability" className="space-y-4">
           <Card>
             <CardHeader>
               <CardTitle>Доступность учителей</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                 <div className="min-w-[280px]">
                   <Select value={availabilityTeacherId} onValueChange={setAvailabilityTeacherId}>
                     <SelectTrigger>
                       <SelectValue placeholder="Выберите учителя" />
                     </SelectTrigger>
                     <SelectContent>
                       {teachers
                         .slice()
                         .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"))
                         .map((t) => (
                           <SelectItem key={t.id} value={t.id}>
                             {t.fullName}
                           </SelectItem>
                         ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="text-sm text-muted-foreground">
                   Выключите слоты, где учитель не может вести урок (совместители, окна занятости и т.п.).
                 </div>
               </div>
 
               {!availabilityTeacherId ? (
                 <div className="text-sm text-muted-foreground">Добавьте учителей и выберите одного.</div>
               ) : (
                 <div className="rounded-lg border overflow-auto">
                   <div
                     className="grid"
                     style={{
                       gridTemplateColumns: `minmax(80px, 120px) repeat(${days.length}, minmax(140px, 1fr))`,
                     }}
                   >
                     <div className="sticky top-0 bg-card border-b p-3 font-medium">Урок</div>
                     {days.map((d) => (
                       <div key={d} className="sticky top-0 bg-card border-b p-3 font-medium">
                         {d}
                       </div>
                     ))}
 
                     {slots.map((slot) => {
                       return (
                         <div key={`av-row-${slot}`} className="contents">
                           <div key={`slot-av-${slot}`} className="border-b p-3 text-sm text-muted-foreground">
                             {slot === 0 ? "0-й" : `${slot}-й`}
                           </div>
                           {days.map((day) => {
                             const available =
                               teacherAvailability[availabilityTeacherId]?.[day]?.[slot] ?? true;
                             return (
                               <div key={`${day}-${slot}`} className="border-b p-3">
                                 <div className="flex items-center gap-2">
                                   <Switch
                                     checked={available}
                                     onCheckedChange={(v) =>
                                       setTeacherAvailabilityCell(availabilityTeacherId, day, slot, v)
                                     }
                                   />
                                   <span className="text-sm text-muted-foreground">
                                     {available ? "Можно" : "Нельзя"}
                                   </span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>
 
         <TabsContent value="anchors" className="space-y-4">
           <Card>
             <CardHeader>
                <CardTitle>Закрепления (класс + предмет/внеурочная деятельность → день/урок)</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               {sortedAnchors.length === 0 ? (
                 <div className="text-sm text-muted-foreground">
                   Пока нет закреплений. Их можно добавить из редактора урока или из справочников «Предметы» / «Внеурочная деятельность».
                 </div>
               ) : (
                 <div className="space-y-2">
                   {sortedAnchors.map((a) => {
                     const c = classes.find((x) => x.id === a.classId);
                     const subj = a.subjectId ? subjects.find((x) => x.id === a.subjectId) : null;
                     const ext = a.extracurricularId ? extracurriculars.find((x) => x.id === a.extracurricularId) : null;
                     const kind = subj ? `Предмет: ${subj.name}` : ext ? `Внеурочная деятельность: ${ext.name}` : "?";
                     const label = `${c ? `${c.grade}${c.letter}` : "?"} — ${kind}`;
                     return (
                       <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                         <div className="min-w-0">
                           <div className="font-medium truncate">{label}</div>
                           <div className="text-sm text-muted-foreground">
                             {a.day}, {a.slot === 0 ? "0-й" : `${a.slot}-й`}
                           </div>
                         </div>
                         <div className="flex gap-2">
                           <Button
                             variant="secondary"
                             onClick={() => {
                               const day = prompt("День", a.day);
                               if (day === null) return;
                               const slotStr = prompt("Урок (номер)", String(a.slot));
                               if (slotStr === null) return;
                               const slot = Number(slotStr);
                               if (!Number.isFinite(slot)) return;
                               upsertScheduleAnchor({ ...a, day: day.trim() || a.day, slot });
                             }}
                           >
                             Изменить
                           </Button>
                           <Button variant="destructive" onClick={() => deleteScheduleAnchor(a.id)}>
                             Удалить
                           </Button>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>
       </Tabs>
 
       <ScheduleEditorDialog
         open={editorOpen}
         onOpenChange={setEditorOpen}
         defaults={editorDefaults}
         classes={classes}
          subjects={combinedSubjects}
         teachers={teachers}
          loadAssignments={[...loadAssignments, ...buildExtracurricularLoadAssignments({
             extracurricularAssignments: schedulableExtracurricularAssignments,
            classes,
            hoursByAssignment: extracurricularHours,
          })]}
         anchors={scheduleAnchors}
         upsertAnchor={upsertScheduleAnchor}
         deleteAnchorFor={deleteScheduleAnchorFor}
         onSave={upsertScheduleLesson}
         onDelete={deleteScheduleLesson}
       />
 
       <ScheduleWeekSettingsDialog
         open={weekOpen}
         onOpenChange={setWeekOpen}
         value={weekGrid}
         onSave={(grid) => setWeekGrid(grid)}
       />
 
       <AlertDialog open={autoDistributeOpen} onOpenChange={setAutoDistributeOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Автораспределение расписания</AlertDialogTitle>
             <AlertDialogDescription>
               Это заполнит расписание на основе распределения нагрузки, закреплений и доступности учителей.
               Существующие уроки будут заменены. Продолжить?
             </AlertDialogDescription>
           </AlertDialogHeader>

             {schedulableExtracurricularAssignments.length ? (
              <div className="mt-4 space-y-4">
                <div className="text-sm text-muted-foreground">
                    Внеурочная деятельность распределяется как «обычные предметы», но часы нужно разложить по классам вручную
                    (сумма по классам должна совпадать с общим количеством часов по назначению).
                </div>

                 <div className="space-y-4 max-h-[40vh] overflow-auto rounded-md border p-3">
                   {schedulableExtracurricularAssignments.map((a) => {
                     const ext = schedulableExtracurriculars.find((e) => e.id === a.extracurricularId);
                    const teacher = teachers.find((t) => t.id === a.teacherId);
                    const v = extracurricularValidation.byId.get(a.id);
                    const targetClasses = sortedClasses.filter((c) => a.targetGrades.includes(c.grade));

                    return (
                      <div key={a.id} className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium">
                            {ext?.name || "Внеурочная деятельность"} — {teacher?.fullName || "Учитель"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Целевые параллели: {a.targetGrades.join(", ")}; всего часов: {a.hoursPerWeek};
                            {v?.mode === "split" ? (
                              <>
                                сумма по классам: {v?.sum ?? 0} {v?.ok ? "(OK)" : "(не совпадает)"}
                              </>
                            ) : (
                              <>
                                одновременно на классы: {v?.parallelSelectedCount ?? 0} {v?.ok ? "(OK)" : "(не выбрано)"}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div className="space-y-0.5">
                            <div className="font-medium">Общее занятие на параллель</div>
                            <div className="text-sm text-muted-foreground">
                              Если включено — этот кружок идёт одновременно на выбранные классы (без конфликта учителя)
                            </div>
                          </div>
                          <Switch
                            checked={(extracurricularMode[a.id] || "split") === "parallel"}
                            onCheckedChange={(on) =>
                              setExtracurricularMode((prev) => ({ ...prev, [a.id]: on ? "parallel" : "split" }))
                            }
                          />
                        </div>

                        {targetClasses.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            Нет классов подходящих параллелей.
                          </div>
                        ) : (
                          (extracurricularMode[a.id] || "split") === "split" ? (
                            <div
                              className="grid gap-2"
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(targetClasses.length, 4)}, minmax(140px, 1fr))`,
                              }}
                            >
                              {targetClasses.map((c) => (
                                <div key={c.id} className="space-y-1">
                                  <div className="text-xs text-muted-foreground">{classLabel(c.grade, c.letter)}</div>
                                  <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={extracurricularHours[a.id]?.[c.id] ?? 0}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const nextVal = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
                                      setExtracurricularHours((prev) => ({
                                        ...prev,
                                        [a.id]: { ...(prev[a.id] || {}), [c.id]: nextVal },
                                      }));
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, minmax(220px, 1fr))" }}>
                              {targetClasses.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 rounded-md border p-2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(extracurricularParallelClasses[a.id]?.[c.id])}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setExtracurricularParallelClasses((prev) => ({
                                        ...prev,
                                        [a.id]: { ...(prev[a.id] || {}), [c.id]: checked },
                                      }));
                                    }}
                                  />
                                  <span className="text-sm">{classLabel(c.grade, c.letter)}</span>
                                </label>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

           <AlertDialogFooter>
             <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAutoDistribute}
                 disabled={schedulableExtracurricularAssignments.length > 0 && !extracurricularValidation.allOk}
                title={
                   schedulableExtracurricularAssignments.length > 0 && !extracurricularValidation.allOk
                    ? "Суммы часов внеурочной деятельности по классам должны совпадать с общим количеством часов"
                    : undefined
                }
              >
                Запустить
              </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }