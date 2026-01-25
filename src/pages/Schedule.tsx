 import { useMemo, useState } from "react";
 import { useApp } from "@/context/AppContext";
 import { Button } from "@/components/ui/button";
 import { Download, Sparkles, Filter } from "lucide-react";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Switch } from "@/components/ui/switch";
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
 
   const { byLessonId } = useMemo(() => {
     return getScheduleIssues({
       lessons: scheduleLessons,
       availability: teacherAvailability,
       anchors: scheduleAnchors,
     });
   }, [scheduleLessons, teacherAvailability, scheduleAnchors]);
 
   const issuesByLessonId = byLessonId;
 
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
 
    const handleAutoDistribute = () => {
      const result = autoDistributeSchedule({
        classes,
        loadAssignments,
        teachers,
        rooms,
        anchors: scheduleAnchors.filter((a) => a.subjectId),
        weekGrid,
        teacherAvailability,
        existingLessons: [],
      });

      setScheduleLessons(result.lessons);
 
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
       subjects,
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
             Ошибки {byLessonId.size > 0 ? `(${byLessonId.size})` : ""}
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
               subjects={subjects}
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
               subjects={subjects}
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
               {byLessonId.size === 0 ? (
                 <div className="text-sm text-muted-foreground">
                   Конфликтов не найдено. Расписание составлено корректно.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {Array.from(byLessonId.entries()).map(([lessonId, issues]) => {
                     const lesson = scheduleLessons.find((l) => l.id === lessonId);
                     if (!lesson) return null;
                     const cls = classes.find((c) => c.id === lesson.classId);
                     const subj = subjects.find((s) => s.id === lesson.subjectId);
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
               <CardTitle>Закрепления (класс + предмет/внеурочка → день/урок)</CardTitle>
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
         subjects={subjects}
         teachers={teachers}
         loadAssignments={loadAssignments}
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
           <AlertDialogFooter>
             <AlertDialogCancel>Отмена</AlertDialogCancel>
             <AlertDialogAction onClick={handleAutoDistribute}>Запустить</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </div>
   );
 }