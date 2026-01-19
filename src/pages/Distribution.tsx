import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  FileSpreadsheet,
  Info,
  Plus,
  Search,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import type { LoadAssignment, TeacherLoad } from "@/types";
import { DistributionEditorDialog } from "@/pages/distribution/DistributionEditorDialog";
import { useDistributionIssues } from "@/pages/distribution/distributionIssues";
import { exportDistributionToExcel } from "@/lib/exportUtils";

export default function Distribution() {
  const {
    classes,
    subjects,
    teachers,
    loadAssignments,
    addLoadAssignment,
    deleteLoadAssignment,
    setLoadAssignments,
    getCurriculumHours,
    curriculumPlan,
    extracurriculars,
    extracurricularAssignments,
    setExtracurricularAssignments,
  } = useApp();

  const [mode, setMode] = useState<"class" | "subject" | "teacher" | "issues">("class");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const [isAutoDialogOpen, setIsAutoDialogOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorDefaults, setEditorDefaults] = useState<
    Partial<Pick<LoadAssignment, "classId" | "subjectId" | "teacherId" | "hoursPerWeek" | "isGroup" | "groupNumber">>
  >({});

  const hasCurriculumData = Object.keys(curriculumPlan).length > 0;

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter)),
    [classes]
  );

  const getSubjectHours = (subjectId: string, classId: string) => getCurriculumHours(subjectId, classId);

  const needsGroupSplit = (subjectId: string, classId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    const cls = classes.find((c) => c.id === classId);
    if (!subject || !cls) return false;
    return Boolean(subject.requiresGroupSplit && subject.groupSplitThreshold && cls.studentCount > subject.groupSplitThreshold);
  };

  const getRequiredHours = (subjectId: string, classId: string) => {
    const hours = getSubjectHours(subjectId, classId);
    if (!hours) return 0;
    return needsGroupSplit(subjectId, classId) ? hours * 2 : hours;
  };

  // ===== Нагрузка по учителям (для режима "По учителям") =====
  const getExtracurricularHoursForTeacher = (teacherId: string): { name: string; hours: number }[] => {
    const assignments = extracurricularAssignments.filter((a) => a.teacherId === teacherId);
    return assignments.map((a) => {
      const ext = extracurriculars.find((e) => e.id === a.extracurricularId);
      return { name: ext?.name || "Неизвестно", hours: a.hoursPerWeek };
    });
  };

  const getClassTeacherExtracurricularHours = (teacherId: string): { name: string; hours: number }[] => {
    const result: { name: string; hours: number }[] = [];
    const teacherClasses = classes.filter((c) => c.classTeacherId === teacherId);
    const classTeacherCourses = extracurriculars.filter((e) => e.isClassTeacherLed);

    teacherClasses.forEach((cls) => {
      classTeacherCourses.forEach((course) => {
        if (course.targetGrades.includes(cls.grade)) {
          result.push({ name: `${course.name} (${cls.grade}${cls.letter})`, hours: course.hoursPerWeek });
        }
      });
    });

    return result;
  };

  const teacherLoads = useMemo((): TeacherLoad[] => {
    return teachers.map((teacher) => {
      const assignments = loadAssignments.filter((a) => a.teacherId === teacher.id);

      const subjectHours = assignments.map((a) => {
        const subject = subjects.find((s) => s.id === a.subjectId);
        const cls = classes.find((c) => c.id === a.classId);
        return {
          subjectName: subject?.name || "Неизвестно",
          className: cls ? `${cls.grade}${cls.letter}` : "Неизвестно",
          hours: a.hoursPerWeek,
        };
      });

      const regularExtracurricular = getExtracurricularHoursForTeacher(teacher.id);
      const classTeacherExtracurricular = getClassTeacherExtracurricularHours(teacher.id);
      const extracurricularHours = [...regularExtracurricular, ...classTeacherExtracurricular];

      const totalSubjectHours = subjectHours.reduce((sum, sh) => sum + sh.hours, 0);
      const totalExtracurricularHours = extracurricularHours.reduce((sum, eh) => sum + eh.hours, 0);
      const totalHours = totalSubjectHours + totalExtracurricularHours;
      const loadPercentage = teacher.maxHours > 0 ? (totalHours / teacher.maxHours) * 100 : 0;

      return {
        teacherId: teacher.id,
        teacherName: teacher.fullName,
        subjectHours,
        extracurricularHours,
        totalHours,
        minHours: teacher.minHours,
        maxHours: teacher.maxHours,
        loadPercentage,
      };
    });
  }, [teachers, loadAssignments, subjects, classes, extracurricularAssignments, extracurriculars]);

  // ===== Автораспределение (оставляем текущую логику как была) =====
  const autoDistribute = () => {
    // NOTE: переносим существующую функцию 1:1 (без изменений логики)
    // Чтобы не раздувать этот файл, оставляем реализацию ниже как в исходной версии.

    const newAssignments: LoadAssignment[] = [];
    const newExtracurricularAssignments = [] as typeof extracurricularAssignments;
    const teacherHours: Record<string, number> = {};
    const teacherGrades: Record<string, Set<number>> = {};
    const teacherAreas: Record<string, Set<string>> = {};

    teachers.forEach((t) => {
      teacherHours[t.id] = 0;
      teacherGrades[t.id] = new Set();
      teacherAreas[t.id] = new Set();

      const ctHours = getClassTeacherExtracurricularHours(t.id);
      teacherHours[t.id] += ctHours.reduce((sum, h) => sum + h.hours, 0);
    });

    interface DistributionTask {
      classId: string;
      grade: number;
      subjectId: string;
      subjectName: string;
      subjectArea: string;
      hours: number;
      groupNumber?: number;
    }

    const tasks: DistributionTask[] = [];
    const sorted = [...classes].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));

    sorted.forEach((cls) => {
      subjects.forEach((subject) => {
        const hours = getSubjectHours(subject.id, cls.id);
        if (hours === 0) return;

        const split = needsGroupSplit(subject.id, cls.id);
        const groupCount = split ? 2 : 1;

        for (let group = 1; group <= groupCount; group++) {
          tasks.push({
            classId: cls.id,
            grade: cls.grade,
            subjectId: subject.id,
            subjectName: subject.name,
            subjectArea: subject.area,
            hours,
            groupNumber: split ? group : undefined,
          });
        }
      });
    });

    const taskKey = (t: DistributionTask) => `${t.classId}__${t.subjectId}__${t.groupNumber ?? 0}`;
    const usedTaskKeys = new Set<string>();

    // === Предзаполнение для «фиксированных» учителей (minHours == maxHours)
    // Цель: набрать ровно нужное число часов (без дробления предметов одного класса).
    const fixedTeachers = teachers
      .filter((t) => t.minHours > 0 && t.minHours === t.maxHours)
      .sort((a, b) => b.minHours - a.minHours);

    for (const teacher of fixedTeachers) {
      const already = teacherHours[teacher.id] ?? 0;
      const target = Math.max(0, teacher.minHours - already);
      if (target <= 0) continue;

      const preferred = new Set(teacher.preferredGrades ?? []);

      const candidates = tasks
        .filter((task) => !usedTaskKeys.has(taskKey(task)))
        .filter((task) => teacher.subjects.includes(task.subjectName))
        .filter((task) => already + task.hours <= teacher.maxHours)
        .filter((task) => task.hours > 0)
        .sort((a, b) => {
          const ap = preferred.size > 0 && preferred.has(a.grade) ? 1 : 0;
          const bp = preferred.size > 0 && preferred.has(b.grade) ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return b.hours - a.hours;
        })
        .slice(0, 30);

      const suffixSum: number[] = new Array(candidates.length + 1).fill(0);
      for (let i = candidates.length - 1; i >= 0; i--) suffixSum[i] = suffixSum[i + 1] + candidates[i].hours;

      let bestSum = 0;
      let bestPreferredHours = -1;
      let bestPick: number[] = [];

      const isPreferredTask = (t: DistributionTask) => preferred.size > 0 && preferred.has(t.grade);

      const dfs = (i: number, sum: number, preferredSum: number, pick: number[]) => {
        if (sum > target) return;

        // Обновляем лучший вариант: сначала максимизируем часы в приоритетных параллелях,
        // затем — общую сумму (чем ближе к target, тем лучше).
        if (preferredSum > bestPreferredHours || (preferredSum === bestPreferredHours && sum > bestSum)) {
          bestPreferredHours = preferredSum;
          bestSum = sum;
          bestPick = [...pick];
        }

        if (i >= candidates.length) return;
        if (sum + suffixSum[i] <= bestSum && preferredSum <= bestPreferredHours) return;

        const nextPreferred = preferredSum + (isPreferredTask(candidates[i]) ? candidates[i].hours : 0);

        // пробуем взять
        dfs(i + 1, sum + candidates[i].hours, nextPreferred, [...pick, i]);
        // и не брать
        dfs(i + 1, sum, preferredSum, pick);
      };

      dfs(0, 0, 0, []);

      for (const idx of bestPick) {
        const task = candidates[idx];
        const key = taskKey(task);
        if (usedTaskKeys.has(key)) continue;

        // гарантия, что не перепрыгнем max
        if ((teacherHours[teacher.id] ?? 0) + task.hours > teacher.maxHours) continue;
        // и что не превысим цель (min==max)
        if ((teacherHours[teacher.id] ?? 0) - already + task.hours > target) continue;

        usedTaskKeys.add(key);
        newAssignments.push({
          id: crypto.randomUUID(),
          teacherId: teacher.id,
          subjectId: task.subjectId,
          classId: task.classId,
          hoursPerWeek: task.hours,
          isGroup: task.groupNumber !== undefined,
          groupNumber: task.groupNumber,
        });
        teacherHours[teacher.id] += task.hours;
        teacherGrades[teacher.id].add(task.grade);
        teacherAreas[teacher.id].add(task.subjectArea);
      }
    }

    const calculateTeacherScore = (teacher: (typeof teachers)[0], task: DistributionTask): number => {
      let score = 0;
      const statusOrder = { штатный: 100, "внутренний совместитель": 50, "внешний совместитель": 0 } as const;
      score += statusOrder[teacher.status];

      if (teacherGrades[teacher.id].has(task.grade)) score += 80;

      const preferred = teacher.preferredGrades ?? [];
      if (preferred.length > 0) score += preferred.includes(task.grade) ? 120 : -10;

      if (teacherAreas[teacher.id].has(task.subjectArea)) score += 40;

      score -= teacherGrades[teacher.id].size * 15;
      if (teacherHours[teacher.id] < teacher.minHours) score += 60;

      const loadRatio = teacher.maxHours > 0 ? teacherHours[teacher.id] / teacher.maxHours : 1;
      score -= loadRatio * 30;

      return score;
    };

    tasks.forEach((task) => {
      if (usedTaskKeys.has(taskKey(task))) return;
      const candidates = teachers
        .filter((t) => t.subjects.includes(task.subjectName))
        .filter((t) => teacherHours[t.id] + task.hours <= t.maxHours);

      if (candidates.length === 0) return;

      const ranked = candidates
        .map((t) => {
          const current = teacherHours[t.id] ?? 0;
          const remainingMin = Math.max(0, t.minHours - current);
          const deficitFraction = t.minHours > 0 ? remainingMin / t.minHours : 0;

          // Важный фактор: «узкие» специалисты (1–2 предмета) должны получать свои часы раньше,
          // иначе их легко «вытеснить» универсальными учителями.
          const specializationBonus = current < t.minHours ? Math.max(0, 6 - (t.subjects?.length ?? 0)) * 20 : 0;

          return {
            teacher: t,
            remainingMin,
            deficitFraction,
            score: calculateTeacherScore(t, task) + specializationBonus,
          };
        })
        .sort((a, b) => {
          // 1) Сначала — те, кто не добрал до минимума
          const aBelow = a.remainingMin > 0 ? 1 : 0;
          const bBelow = b.remainingMin > 0 ? 1 : 0;
          if (aBelow !== bBelow) return bBelow - aBelow;

          // 2) Затем — кто «дальше от пола» в относительном смысле
          if (a.deficitFraction !== b.deficitFraction) return b.deficitFraction - a.deficitFraction;

          // 3) Затем — общий скоринг (приоритет параллелей, группировка и т.д.)
          return b.score - a.score;
        });

      const top = ranked[0];
      if (!top) return;

      newAssignments.push({
        id: crypto.randomUUID(),
        teacherId: top.teacher.id,
        subjectId: task.subjectId,
        classId: task.classId,
        hoursPerWeek: task.hours,
        isGroup: task.groupNumber !== undefined,
        groupNumber: task.groupNumber,
      });

      teacherHours[top.teacher.id] += task.hours;
      teacherGrades[top.teacher.id].add(task.grade);
      teacherAreas[top.teacher.id].add(task.subjectArea);
    });

    // внеурочка: сохраняем существующие ручные назначения (кроме курсов классного руководителя)
    extracurricularAssignments.forEach((assignment) => {
      const ext = extracurriculars.find((e) => e.id === assignment.extracurricularId);
      if (ext && !ext.isClassTeacherLed) {
        newExtracurricularAssignments.push(assignment);
        teacherHours[assignment.teacherId] = (teacherHours[assignment.teacherId] || 0) + assignment.hoursPerWeek;
      }
    });

    const regularExtracurriculars = extracurriculars.filter((e) => !e.isClassTeacherLed);
    const assignedExtracurricularIds = new Set(extracurricularAssignments.map((a) => a.extracurricularId));

    regularExtracurriculars
      .filter((ext) => !assignedExtracurricularIds.has(ext.id))
      .forEach((ext) => {
        const suitableTeachers = teachers
          .filter((t) => teacherHours[t.id] + ext.hoursPerWeek <= t.maxHours)
          .sort((a, b) => {
            const aScore = teacherHours[a.id] < a.minHours ? 100 : 0;
            const bScore = teacherHours[b.id] < b.minHours ? 100 : 0;

            const statusOrder = { штатный: 50, "внутренний совместитель": 25, "внешний совместитель": 0 } as const;
            const aStatusScore = statusOrder[a.status];
            const bStatusScore = statusOrder[b.status];

            return bScore + bStatusScore - (aScore + aStatusScore);
          });

        if (suitableTeachers.length > 0) {
          const teacher = suitableTeachers[0];
          newExtracurricularAssignments.push({
            id: crypto.randomUUID(),
            teacherId: teacher.id,
            extracurricularId: ext.id,
            targetGrades: ext.targetGrades,
            hoursPerWeek: ext.hoursPerWeek,
          });
          teacherHours[teacher.id] += ext.hoursPerWeek;
        }
      });

    setLoadAssignments(newAssignments);
    setExtracurricularAssignments(newExtracurricularAssignments);
    setIsAutoDialogOpen(false);
    toast.success(`Распределено: ${newAssignments.length} предметных назначений, ${newExtracurricularAssignments.length} внеурочных`);
  };

  // ===== Статистика (верхние карточки) =====
  const stats = useMemo(() => {
    const totalAssignments = loadAssignments.length;

    let uncoveredHours = 0;
    sortedClasses.forEach((cls) => {
      subjects.forEach((subject) => {
        const required = getRequiredHours(subject.id, cls.id);
        if (required <= 0) return;

        const assigned = loadAssignments
          .filter((a) => a.subjectId === subject.id && a.classId === cls.id)
          .reduce((sum, a) => sum + a.hoursPerWeek, 0);

        uncoveredHours += Math.max(0, required - assigned);
      });
    });

    const overloadedTeachers = teacherLoads.filter((tl) => tl.loadPercentage > 100).length;

    return {
      totalAssignments,
      uncoveredHours,
      overloadedTeachers,
    };
  }, [loadAssignments, sortedClasses, subjects, teacherLoads, getRequiredHours]);

  const hasTeacherOverload = stats.overloadedTeachers > 0;

  const issues = useDistributionIssues({
    classes,
    subjects,
    loadAssignments,
    getRequiredHours,
  });

  const problemClassIds = useMemo(() => new Set(issues.map((i) => i.classId).filter(Boolean) as string[]), [issues]);
  const problemSubjectIds = useMemo(() => new Set(issues.map((i) => i.subjectId).filter(Boolean) as string[]), [issues]);

  const hasClassProblems = problemClassIds.size > 0;
  const hasSubjectProblems = problemSubjectIds.size > 0;
  const hasIssues = issues.length > 0;

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (mode === "class") {
      return sortedClasses
        .filter((c) => `${c.grade}${c.letter}`.toLowerCase().includes(q))
        .map((c) => ({
          id: c.id,
          title: `${c.grade}${c.letter}`,
          subtitle: c.profile,
          tone: problemClassIds.has(c.id) ? ("danger" as const) : undefined,
        }));
    }

    if (mode === "subject") {
      return subjects
        .filter((s) => s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q))
        .map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: s.area,
          tone: problemSubjectIds.has(s.id) ? ("danger" as const) : undefined,
        }));
    }

    if (mode === "teacher") {
      return teachers
        .filter((t) => t.fullName.toLowerCase().includes(q))
        .map((t) => {
          const load = teacherLoads.find((tl) => tl.teacherId === t.id);
          const isOver = (load?.loadPercentage ?? 0) > 100;
          return { id: t.id, title: t.fullName, subtitle: t.position, tone: isOver ? ("danger" as const) : undefined };
        });
    }

    return [];
  }, [mode, query, sortedClasses, subjects, teachers, teacherLoads, problemClassIds, problemSubjectIds]);

  const ensureSelected = (nextMode: typeof mode) => {
    const id = selectedId;
    if (nextMode === "class" && !sortedClasses.some((c) => c.id === id)) setSelectedId(sortedClasses[0]?.id ?? "");
    if (nextMode === "subject" && !subjects.some((s) => s.id === id)) setSelectedId(subjects[0]?.id ?? "");
    if (nextMode === "teacher" && !teachers.some((t) => t.id === id)) setSelectedId(teachers[0]?.id ?? "");
  };

  // инициализируем выбор при первом заходе
  useEffect(() => {
    if (!selectedId) setSelectedId(sortedClasses[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (teachers.length === 0 || classes.length === 0 || subjects.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Распределение нагрузки</h1>
          <p className="text-muted-foreground">Назначение учителей на предметы и классы</p>
        </header>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Недостаточно данных</AlertTitle>
          <AlertDescription>Добавьте учителей, классы и предметы в справочниках.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasCurriculumData) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Распределение нагрузки</h1>
          <p className="text-muted-foreground">Назначение учителей на предметы и классы</p>
        </header>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Учебный план не заполнен</AlertTitle>
          <AlertDescription>
            Сначала заполните учебный план (раздел «Учебный план»), указав количество часов по предметам и классам.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const openEditor = (defaults?: typeof editorDefaults) => {
    setEditorDefaults(defaults ?? {});
    setIsEditorOpen(true);
  };

  const teacherShort = (fullName?: string) => (fullName ? fullName.split(" ")[0] : "—");

  const detailHeader = useMemo(() => {
    if (mode === "class") {
      const cls = classes.find((c) => c.id === selectedId);
      return cls ? `${cls.grade}${cls.letter}` : "";
    }
    if (mode === "subject") {
      const s = subjects.find((x) => x.id === selectedId);
      return s?.name ?? "";
    }
    if (mode === "teacher") {
      const t = teachers.find((x) => x.id === selectedId);
      return t?.fullName ?? "";
    }
    return "";
  }, [mode, selectedId, classes, subjects, teachers]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Распределение нагрузки</h1>
          <p className="text-muted-foreground">Быстрый поиск, ручная правка и список ошибок</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={loadAssignments.length === 0 && extracurricularAssignments.length === 0}
            onClick={() =>
              exportDistributionToExcel(
                teachers,
                classes,
                subjects,
                extracurriculars,
                loadAssignments,
                extracurricularAssignments
              )
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Экспорт в Excel
          </Button>

          <Dialog open={isAutoDialogOpen} onOpenChange={setIsAutoDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Wand2 className="h-4 w-4 mr-2" />
                Автораспределение
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Автоматическое распределение</DialogTitle>
                <DialogDescription>
                  Система автоматически распределит нагрузку на основе специализации, нагрузки и приоритетов.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Специализация учителей (какие предметы могут вести)</li>
                  <li>Минимальная и максимальная нагрузка</li>
                  <li>Приоритет штатных сотрудников</li>
                  <li>Приоритетные параллели (если заполнены)</li>
                  <li>Деление на группы (если требуется)</li>
                  <li>Внеурочная деятельность (обычные курсы)</li>
                </ul>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Внимание</AlertTitle>
                  <AlertDescription>
                    Текущее распределение предметов и обычной внеурочки будет заменено новым. Курсы классного руководителя сохраняются.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAutoDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={autoDistribute}>Распределить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => openEditor({ hoursPerWeek: 0 })}>
            <Plus className="h-4 w-4 mr-2" />
            Редактор назначений
          </Button>
        </div>
      </header>

      {/* Статистика (компактная) */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Назначений</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Незакрытые часы</CardTitle>
            {stats.uncoveredHours > 0 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uncoveredHours}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проблем</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{issues.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          const next = v as typeof mode;
          setMode(next);
          ensureSelected(next);
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="class" className={hasClassProblems ? "text-destructive" : undefined}>
            По классам
          </TabsTrigger>
          <TabsTrigger value="subject" className={hasSubjectProblems ? "text-destructive" : undefined}>
            По предметам
          </TabsTrigger>
          <TabsTrigger value="teacher" className={hasTeacherOverload ? "text-destructive" : undefined}>
            По учителям
          </TabsTrigger>
          <TabsTrigger value="issues" className={hasIssues ? "text-destructive" : undefined}>
            Ошибки
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {/* Левая колонка: поиск + список */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">Поиск</CardTitle>
              <CardDescription>Фильтр списка слева</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    mode === "class"
                      ? "Напр. 5А"
                      : mode === "subject"
                        ? "Напр. Математика"
                        : mode === "teacher"
                          ? "Фамилия"
                          : ""
                  }
                  className="pl-8"
                  disabled={mode === "issues"}
                />
              </div>

              {mode !== "issues" ? (
                <ScrollArea className="h-[520px] pr-2">
                  <div className="space-y-1">
                    {filteredList.map((item) => {
                      const isSelected = selectedId === item.id;
                      const isDanger = (item as { tone?: "danger" }).tone === "danger";

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={
                            "w-full text-left rounded-md border px-3 py-2 transition " +
                            (isSelected
                              ? "bg-muted"
                              : isDanger
                                ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                                : "hover:bg-muted/50")
                          }
                        >
                          <div className={"text-sm font-medium " + (isDanger ? "text-destructive" : "")}>{item.title}</div>
                          {item.subtitle ? (
                            <div className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground">Откройте вкладку «Ошибки» справа.</div>
              )}
            </CardContent>
          </Card>

          {/* Правая колонка: детали */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{mode === "issues" ? "Ошибки и предупреждения" : detailHeader}</CardTitle>
              <CardDescription>
                {mode === "class" && "Предметы выбранного класса: норма, назначено, быстрые действия"}
                {mode === "subject" && "Классы выбранного предмета: норма, назначено, быстрые действия"}
                {mode === "teacher" && "Нагрузка и список назначений выбранного учителя"}
                {mode === "issues" && "Проверки: недобор/перебор часов и дубли назначений"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <TabsContent value="class">
                <ClassDetail
                  classId={selectedId}
                  classes={classes}
                  subjects={subjects}
                  teachers={teachers}
                  loadAssignments={loadAssignments}
                  getRequiredHours={getRequiredHours}
                  teacherShort={teacherShort}
                  onDelete={(id) => {
                    deleteLoadAssignment(id);
                    toast.success("Назначение удалено");
                  }}
                  onQuickAdd={(subjectId) => {
                    openEditor({ classId: selectedId, subjectId, hoursPerWeek: getSubjectHours(subjectId, selectedId) });
                  }}
                />
              </TabsContent>

              <TabsContent value="subject">
                <SubjectDetail
                  subjectId={selectedId}
                  classes={sortedClasses}
                  subjects={subjects}
                  teachers={teachers}
                  loadAssignments={loadAssignments}
                  getRequiredHours={getRequiredHours}
                  teacherShort={teacherShort}
                  onDelete={(id) => {
                    deleteLoadAssignment(id);
                    toast.success("Назначение удалено");
                  }}
                  onQuickAdd={(classId) => {
                    openEditor({ classId, subjectId: selectedId, hoursPerWeek: getSubjectHours(selectedId, classId) });
                  }}
                />
              </TabsContent>

              <TabsContent value="teacher">
                <TeacherDetail
                  teacherId={selectedId}
                  teacherLoads={teacherLoads}
                  loadAssignments={loadAssignments}
                  classes={classes}
                  subjects={subjects}
                  onDelete={(id) => {
                    deleteLoadAssignment(id);
                    toast.success("Назначение удалено");
                  }}
                  onAdd={() => openEditor({ teacherId: selectedId, hoursPerWeek: 0 })}
                />
              </TabsContent>

              <TabsContent value="issues">
                <IssuesDetail
                  issues={issues}
                  classes={classes}
                  subjects={subjects}
                  onGoTo={(t) => {
                    if (t.classId) {
                      setMode("class");
                      setSelectedId(t.classId);
                    } else if (t.subjectId) {
                      setMode("subject");
                      setSelectedId(t.subjectId);
                    }
                  }}
                />
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </Tabs>

      <DistributionEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        teachers={teachers}
        subjects={subjects}
        classes={classes}
        defaults={editorDefaults}
        getDefaultHours={(subjectId, classId) => getSubjectHours(subjectId, classId)}
        onSubmit={(assignment) => {
          addLoadAssignment(assignment);
        }}
      />
    </div>
  );
}

function ClassDetail(props: {
  classId: string;
  classes: { id: string; grade: number; letter: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
  loadAssignments: LoadAssignment[];
  getRequiredHours: (subjectId: string, classId: string) => number;
  teacherShort: (fullName?: string) => string;
  onDelete: (assignmentId: string) => void;
  onQuickAdd: (subjectId: string) => void;
}) {
  const { classId, subjects, teachers, loadAssignments, getRequiredHours, teacherShort, onDelete, onQuickAdd } = props;

  const rows = useMemo(() => {
    return subjects
      .map((s) => {
        const required = getRequiredHours(s.id, classId);
        if (required <= 0) return null;

        const assignments = loadAssignments.filter((a) => a.classId === classId && a.subjectId === s.id);
        const assigned = assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);

        return { subject: s, required, assigned, assignments };
      })
      .filter(Boolean) as { subject: (typeof subjects)[number]; required: number; assigned: number; assignments: LoadAssignment[] }[];
  }, [subjects, classId, loadAssignments, getRequiredHours]);

  if (!classId) return <div className="text-sm text-muted-foreground">Выберите класс слева.</div>;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Предмет</TableHead>
            <TableHead className="text-center">Назначено/Норма</TableHead>
            <TableHead>Учителя</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const ok = r.assigned === r.required;
            const progress = r.required > 0 ? Math.min(100, (r.assigned / r.required) * 100) : 0;
            return (
              <TableRow key={r.subject.id}>
                <TableCell className="font-medium">{r.subject.name}</TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">{r.assigned}/{r.required}</div>
                  <Progress value={progress} className="h-2" />
                  {!ok && (
                    <div className="mt-1 text-xs text-muted-foreground">Требует проверки</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {r.assignments.length === 0 ? (
                      <Badge variant="outline">—</Badge>
                    ) : (
                      r.assignments.map((a) => {
                        const t = teachers.find((x) => x.id === a.teacherId);
                        return (
                          <span key={a.id} className="inline-flex items-center gap-1">
                            <Badge variant="secondary">
                              {teacherShort(t?.fullName)} {a.isGroup ? `Гр.${a.groupNumber}` : ""} ({a.hoursPerWeek}ч)
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(a.id)}
                              aria-label="Удалить назначение"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onQuickAdd(r.subject.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SubjectDetail(props: {
  subjectId: string;
  classes: { id: string; grade: number; letter: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
  loadAssignments: LoadAssignment[];
  getRequiredHours: (subjectId: string, classId: string) => number;
  teacherShort: (fullName?: string) => string;
  onDelete: (assignmentId: string) => void;
  onQuickAdd: (classId: string) => void;
}) {
  const { subjectId, classes, subjects, teachers, loadAssignments, getRequiredHours, teacherShort, onDelete, onQuickAdd } = props;

  const subject = subjects.find((s) => s.id === subjectId);
  if (!subjectId) return <div className="text-sm text-muted-foreground">Выберите предмет слева.</div>;

  const rows = useMemo(() => {
    return classes
      .map((c) => {
        const required = getRequiredHours(subjectId, c.id);
        if (required <= 0) return null;

        const assignments = loadAssignments.filter((a) => a.classId === c.id && a.subjectId === subjectId);
        const assigned = assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);

        return { cls: c, required, assigned, assignments };
      })
      .filter(Boolean) as { cls: (typeof classes)[number]; required: number; assigned: number; assignments: LoadAssignment[] }[];
  }, [classes, subjectId, loadAssignments, getRequiredHours]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">Предмет: <span className="text-foreground font-medium">{subject?.name}</span></div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Класс</TableHead>
            <TableHead className="text-center">Назначено/Норма</TableHead>
            <TableHead>Учителя</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const progress = r.required > 0 ? Math.min(100, (r.assigned / r.required) * 100) : 0;
            return (
              <TableRow key={r.cls.id}>
                <TableCell className="font-medium">{r.cls.grade}{r.cls.letter}</TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">{r.assigned}/{r.required}</div>
                  <Progress value={progress} className="h-2" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {r.assignments.length === 0 ? (
                      <Badge variant="outline">—</Badge>
                    ) : (
                      r.assignments.map((a) => {
                        const t = teachers.find((x) => x.id === a.teacherId);
                        return (
                          <span key={a.id} className="inline-flex items-center gap-1">
                            <Badge variant="secondary">
                              {teacherShort(t?.fullName)} {a.isGroup ? `Гр.${a.groupNumber}` : ""} ({a.hoursPerWeek}ч)
                            </Badge>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)} aria-label="Удалить назначение">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onQuickAdd(r.cls.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TeacherDetail(props: {
  teacherId: string;
  teacherLoads: TeacherLoad[];
  loadAssignments: LoadAssignment[];
  classes: { id: string; grade: number; letter: string }[];
  subjects: { id: string; name: string }[];
  onDelete: (assignmentId: string) => void;
  onAdd: () => void;
}) {
  const { teacherId, teacherLoads, loadAssignments, classes, subjects, onDelete, onAdd } = props;
  const load = teacherLoads.find((t) => t.teacherId === teacherId);

  if (!teacherId) return <div className="text-sm text-muted-foreground">Выберите учителя слева.</div>;
  if (!load) return <div className="text-sm text-muted-foreground">Нет данных по учителю.</div>;

  const assignments = loadAssignments.filter((a) => a.teacherId === teacherId);
  const isOver = load.loadPercentage > 100;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Итого:</span> <span className="font-medium">{load.totalHours} ч.</span>
          <span className="text-muted-foreground"> / макс {load.maxHours} ч.</span>
        </div>
        <div className="flex items-center gap-2">
          {isOver ? <Badge variant="destructive">Перегруз</Badge> : <Badge variant="secondary">Ок</Badge>}
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      <Progress value={Math.min(100, load.loadPercentage)} className="h-2" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Класс</TableHead>
            <TableHead>Предмет</TableHead>
            <TableHead className="text-center">Часов</TableHead>
            <TableHead className="text-center">Группа</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Нет назначений.
              </TableCell>
            </TableRow>
          ) : (
            assignments.map((a) => {
              const cls = classes.find((c) => c.id === a.classId);
              const subj = subjects.find((s) => s.id === a.subjectId);
              return (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{cls ? `${cls.grade}${cls.letter}` : "—"}</TableCell>
                  <TableCell>{subj?.name ?? "—"}</TableCell>
                  <TableCell className="text-center">{a.hoursPerWeek}</TableCell>
                  <TableCell className="text-center">{a.isGroup ? <Badge variant="outline">Гр. {a.groupNumber}</Badge> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDelete(a.id)} aria-label="Удалить назначение">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function IssuesDetail(props: {
  issues: { id: string; title: string; description: string; classId?: string; subjectId?: string }[];
  classes: { id: string; grade: number; letter: string }[];
  subjects: { id: string; name: string }[];
  onGoTo: (t: { classId?: string; subjectId?: string }) => void;
}) {
  const { issues, classes, subjects, onGoTo } = props;

  const classLabel = (id?: string) => {
    const c = classes.find((x) => x.id === id);
    return c ? `${c.grade}${c.letter}` : "—";
  };

  const subjectLabel = (id?: string) => subjects.find((x) => x.id === id)?.name ?? "—";

  if (issues.length === 0) {
    return <div className="text-sm text-muted-foreground">Ошибок не найдено.</div>;
  }

  return (
    <div className="space-y-2">
      {issues.map((i) => (
        <div key={i.id} className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-medium text-destructive">{i.title}</div>
              <div className="text-sm text-muted-foreground">{i.description}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {i.classId && <Badge variant="outline">Класс: {classLabel(i.classId)}</Badge>}
                {i.subjectId && <Badge variant="outline">Предмет: {subjectLabel(i.subjectId)}</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onGoTo(i)}>
              Открыть
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
