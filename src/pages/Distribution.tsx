import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Info, Wand2, Users, BookOpen, Trash2, Plus, AlertCircle, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { LoadAssignment, TeacherLoad, ExtracurricularAssignment } from '@/types';

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
    addExtracurricularAssignment,
    setExtracurricularAssignments
  } = useApp();
  
  const [isAutoDialogOpen, setIsAutoDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');

  // Получить часы из учебного плана
  const getSubjectHours = (subjectId: string, classId: string) => {
    return getCurriculumHours(subjectId, classId);
  };

  // Проверка, требуется ли деление на группы
  const needsGroupSplit = (subjectId: string, classId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    const cls = classes.find(c => c.id === classId);
    if (!subject || !cls) return false;
    return subject.requiresGroupSplit && subject.groupSplitThreshold && cls.studentCount > subject.groupSplitThreshold;
  };

  // Часы внеурочки для учителя (обычные назначения)
  const getExtracurricularHoursForTeacher = (teacherId: string): { name: string; hours: number }[] => {
    const assignments = extracurricularAssignments.filter(a => a.teacherId === teacherId);
    return assignments.map(a => {
      const ext = extracurriculars.find(e => e.id === a.extracurricularId);
      return {
        name: ext?.name || 'Неизвестно',
        hours: a.hoursPerWeek,
      };
    });
  };

  // Часы внеурочки классного руководителя
  const getClassTeacherExtracurricularHours = (teacherId: string): { name: string; hours: number }[] => {
    const result: { name: string; hours: number }[] = [];
    
    // Находим классы, где этот учитель — классный руководитель
    const teacherClasses = classes.filter(c => c.classTeacherId === teacherId);
    
    // Находим курсы классного руководителя
    const classTeacherCourses = extracurriculars.filter(e => e.isClassTeacherLed);
    
    teacherClasses.forEach(cls => {
      classTeacherCourses.forEach(course => {
        if (course.targetGrades.includes(cls.grade)) {
          result.push({
            name: `${course.name} (${cls.grade}${cls.letter})`,
            hours: course.hoursPerWeek,
          });
        }
      });
    });
    
    return result;
  };

  // Нагрузка по учителям
  const teacherLoads = useMemo((): TeacherLoad[] => {
    return teachers.map(teacher => {
      const assignments = loadAssignments.filter(a => a.teacherId === teacher.id);
      
      const subjectHours = assignments.map(a => {
        const subject = subjects.find(s => s.id === a.subjectId);
        const cls = classes.find(c => c.id === a.classId);
        return {
          subjectName: subject?.name || 'Неизвестно',
          className: cls ? `${cls.grade}${cls.letter}` : 'Неизвестно',
          hours: a.hoursPerWeek,
        };
      });

      // Часы внеурочки (обычные назначения + курсы классного руководителя)
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

  // Статистика
  const stats = useMemo(() => {
    const totalAssignments = loadAssignments.length;
    const totalExtracurricularAssignments = extracurricularAssignments.length;
    const overloadedTeachers = teacherLoads.filter(tl => tl.loadPercentage > 100).length;
    const underloadedTeachers = teacherLoads.filter(tl => tl.totalHours < tl.minHours && tl.totalHours > 0).length;
    
    // Подсчёт незакрытых часов по предметам
    let uncoveredHours = 0;
    classes.forEach(cls => {
      subjects.forEach(subject => {
        const hours = getSubjectHours(subject.id, cls.id);
        if (hours > 0) {
          const assignments = loadAssignments.filter(
            a => a.subjectId === subject.id && a.classId === cls.id
          );
          const assignedHours = assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
          const requiredHours = needsGroupSplit(subject.id, cls.id) ? hours * 2 : hours;
          uncoveredHours += Math.max(0, requiredHours - assignedHours);
        }
      });
    });

    return {
      totalAssignments,
      totalExtracurricularAssignments,
      overloadedTeachers,
      underloadedTeachers,
      uncoveredHours,
    };
  }, [loadAssignments, teacherLoads, classes, subjects, curriculumPlan, extracurricularAssignments]);

  // Матрица распределения (предмет × класс)
  const distributionMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { assigned: number; required: number; teachers: string[] }>> = {};
    
    subjects.forEach(subject => {
      matrix[subject.id] = {};
      classes.forEach(cls => {
        const hours = getSubjectHours(subject.id, cls.id);
        const needsSplit = needsGroupSplit(subject.id, cls.id);
        const requiredHours = needsSplit ? hours * 2 : hours;
        
        const assignments = loadAssignments.filter(
          a => a.subjectId === subject.id && a.classId === cls.id
        );
        const assignedHours = assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
        const teacherNames = assignments.map(a => {
          const teacher = teachers.find(t => t.id === a.teacherId);
          return teacher?.fullName.split(' ')[0] || '?';
        });

        matrix[subject.id][cls.id] = {
          assigned: assignedHours,
          required: requiredHours,
          teachers: teacherNames,
        };
      });
    });

    return matrix;
  }, [subjects, classes, loadAssignments, teachers, curriculumPlan]);

  // Автоматическое распределение
  const autoDistribute = () => {
    const newAssignments: LoadAssignment[] = [];
    const newExtracurricularAssignments: ExtracurricularAssignment[] = [];
    const teacherHours: Record<string, number> = {};
    const teacherGrades: Record<string, Set<number>> = {};
    const teacherAreas: Record<string, Set<string>> = {};
    
    // Инициализация счётчиков часов учителей (включая существующие назначения внеурочки классного руководителя)
    teachers.forEach(t => {
      teacherHours[t.id] = 0;
      teacherGrades[t.id] = new Set();
      teacherAreas[t.id] = new Set();
      
      // Учитываем часы внеурочки классного руководителя
      const ctHours = getClassTeacherExtracurricularHours(t.id);
      teacherHours[t.id] += ctHours.reduce((sum, h) => sum + h.hours, 0);
    });

    // ===== РАСПРЕДЕЛЕНИЕ ПРЕДМЕТОВ =====
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
    
    const sortedClasses = [...classes].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));

    sortedClasses.forEach(cls => {
      subjects.forEach(subject => {
        const hours = getSubjectHours(subject.id, cls.id);
        if (hours === 0) return;

        const needsSplit = needsGroupSplit(subject.id, cls.id);
        const groupCount = needsSplit ? 2 : 1;

        for (let group = 1; group <= groupCount; group++) {
          tasks.push({
            classId: cls.id,
            grade: cls.grade,
            subjectId: subject.id,
            subjectName: subject.name,
            subjectArea: subject.area,
            hours,
            groupNumber: needsSplit ? group : undefined,
          });
        }
      });
    });

    tasks.sort((a, b) => {
      if (a.subjectArea !== b.subjectArea) return a.subjectArea.localeCompare(b.subjectArea);
      if (a.subjectId !== b.subjectId) return a.subjectName.localeCompare(b.subjectName);
      return a.grade - b.grade;
    });

    const calculateTeacherScore = (teacher: typeof teachers[0], task: DistributionTask): number => {
      let score = 0;
      
      const statusOrder = { 'штатный': 100, 'внутренний совместитель': 50, 'внешний совместитель': 0 };
      score += statusOrder[teacher.status];
      
      if (teacherGrades[teacher.id].has(task.grade)) {
        score += 80;
      }
      
      if (teacherAreas[teacher.id].has(task.subjectArea)) {
        score += 40;
      }
      
      score -= teacherGrades[teacher.id].size * 15;
      
      if (teacherHours[teacher.id] < teacher.minHours) {
        score += 60;
      }
      
      const loadRatio = teacher.maxHours > 0 ? teacherHours[teacher.id] / teacher.maxHours : 1;
      score -= loadRatio * 30;
      
      return score;
    };

    tasks.forEach(task => {
      const suitableTeachers = teachers
        .filter(t => t.subjects.includes(task.subjectName))
        .filter(t => teacherHours[t.id] + task.hours <= t.maxHours)
        .map(t => ({ teacher: t, score: calculateTeacherScore(t, task) }))
        .sort((a, b) => b.score - a.score);

      if (suitableTeachers.length > 0) {
        const { teacher } = suitableTeachers[0];
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
    });

    // ===== РАСПРЕДЕЛЕНИЕ ВНЕУРОЧКИ (обычные курсы) =====
    const regularExtracurriculars = extracurriculars.filter(e => !e.isClassTeacherLed);
    
    regularExtracurriculars.forEach(ext => {
      // Находим учителя с наименьшей нагрузкой, который может вести внеурочку
      const suitableTeachers = teachers
        .filter(t => teacherHours[t.id] + ext.hoursPerWeek <= t.maxHours)
        .sort((a, b) => {
          // Приоритет учителям, которые ведут похожие предметы (хотя бы один)
          // или которые недогружены
          const aScore = teacherHours[a.id] < a.minHours ? 100 : 0;
          const bScore = teacherHours[b.id] < b.minHours ? 100 : 0;
          
          const statusOrder = { 'штатный': 50, 'внутренний совместитель': 25, 'внешний совместитель': 0 };
          const aStatusScore = statusOrder[a.status];
          const bStatusScore = statusOrder[b.status];
          
          return (bScore + bStatusScore) - (aScore + aStatusScore);
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

  // Добавление ручного назначения
  const handleManualAssign = () => {
    if (!selectedSubject || !selectedClass || !selectedTeacher) {
      toast.error('Заполните все поля');
      return;
    }

    const hours = getSubjectHours(selectedSubject, selectedClass);
    if (hours === 0) {
      toast.error('Этот предмет не преподаётся в данном классе');
      return;
    }

    addLoadAssignment({
      id: crypto.randomUUID(),
      teacherId: selectedTeacher,
      subjectId: selectedSubject,
      classId: selectedClass,
      hoursPerWeek: hours,
    });

    setIsAssignDialogOpen(false);
    setSelectedSubject('');
    setSelectedClass('');
    setSelectedTeacher('');
    toast.success('Назначение добавлено');
  };

  // Учителя, которые могут вести выбранный предмет
  const availableTeachers = useMemo(() => {
    if (!selectedSubject) return teachers;
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) return teachers;
    return teachers.filter(t => t.subjects.includes(subject.name));
  }, [selectedSubject, subjects, teachers]);

  // Проверка, заполнен ли учебный план
  const hasCurriculumData = Object.keys(curriculumPlan).length > 0;

  if (teachers.length === 0 || classes.length === 0 || subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Распределение нагрузки</h1>
          <p className="text-muted-foreground">Назначение учителей на предметы и классы</p>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Недостаточно данных</AlertTitle>
          <AlertDescription>
            Для распределения нагрузки необходимо добавить учителей, классы и предметы в справочниках.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasCurriculumData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Распределение нагрузки</h1>
          <p className="text-muted-foreground">Назначение учителей на предметы и классы</p>
        </div>
        
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Учебный план не заполнен</AlertTitle>
          <AlertDescription>
            Сначала заполните учебный план (раздел «Учебный план»), указав количество часов по предметам и классам. 
            После этого система сможет автоматически распределить нагрузку между учителями.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Распределение нагрузки</h1>
          <p className="text-muted-foreground">Назначение учителей на предметы и классы</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Добавить назначение
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новое назначение</DialogTitle>
                <DialogDescription>
                  Выберите предмет, класс и учителя для назначения
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Предмет</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите предмет" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Класс</label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите класс" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes
                        .sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter))
                        .map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.grade}{c.letter}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Учитель</label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите учителя" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSubject && availableTeachers.length === 0 && (
                    <p className="text-sm text-destructive">
                      Нет учителей, которые могут вести этот предмет
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleManualAssign}>Назначить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
                  Система автоматически распределит нагрузку на основе:
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground py-4">
                <li>Специализации учителей (какие предметы могут вести)</li>
                <li>Минимальной и максимальной нагрузки учителей</li>
                <li>Приоритета штатных сотрудников над совместителями</li>
                <li>Группировки классов одной параллели у одного учителя</li>
                <li>Группировки предметов одной области у одного учителя</li>
                <li><strong>Включая внеурочную деятельность</strong> (обычные курсы)</li>
              </ul>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Внимание!</AlertTitle>
                <AlertDescription>
                  Текущее распределение (предметы + внеурочка) будет полностью заменено новым.
                  Курсы классного руководителя сохраняются автоматически.
                </AlertDescription>
              </Alert>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAutoDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={autoDistribute}>Распределить</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Предметных</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Внеурочных</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExtracurricularAssignments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Незакрытые часы</CardTitle>
            {stats.uncoveredHours > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.uncoveredHours > 0 ? 'text-amber-500' : 'text-green-500'}`}>
              {stats.uncoveredHours}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Перегружены</CardTitle>
            {stats.overloadedTeachers > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overloadedTeachers > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {stats.overloadedTeachers}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ниже минимума</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{stats.underloadedTeachers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teachers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teachers">По учителям</TabsTrigger>
          <TabsTrigger value="matrix">Матрица распределения</TabsTrigger>
          <TabsTrigger value="assignments">Все назначения</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Нагрузка по учителям</CardTitle>
              <CardDescription>
                Текущая нагрузка каждого учителя (предметы + внеурочка)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherLoads.map(tl => {
                  const isOverloaded = tl.loadPercentage > 100;
                  const isBelowMin = tl.totalHours < tl.minHours && tl.totalHours > 0;
                  return (
                    <div key={tl.teacherId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium">{tl.teacherName}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            (мин: {tl.minHours} ч., макс: {tl.maxHours} ч.)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isOverloaded ? 'text-destructive' : isBelowMin ? 'text-amber-500' : 'text-green-600'}`}>
                            {tl.totalHours}/{tl.maxHours} ч.
                          </span>
                          {isOverloaded && <Badge variant="destructive">Перегрузка</Badge>}
                          {isBelowMin && <Badge variant="outline" className="text-amber-600 border-amber-300">Ниже минимума</Badge>}
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(tl.loadPercentage, 100)} 
                        className={`h-2 ${isOverloaded ? '[&>div]:bg-destructive' : ''}`}
                      />
                      
                      {/* Предметы */}
                      {tl.subjectHours.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-muted-foreground mb-1">Предметы:</p>
                          <div className="flex flex-wrap gap-1">
                            {tl.subjectHours.map((sh, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {sh.subjectName} ({sh.className}) — {sh.hours}ч.
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Внеурочка */}
                      {tl.extracurricularHours.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">Внеурочка:</p>
                          <div className="flex flex-wrap gap-1">
                            {tl.extracurricularHours.map((eh, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                {eh.name} — {eh.hours}ч.
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Матрица распределения</CardTitle>
              <CardDescription>
                Предметы × Классы с указанием назначенных учителей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background min-w-[200px]">Предмет</TableHead>
                      {classes
                        .sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter))
                        .map(cls => (
                          <TableHead key={cls.id} className="text-center min-w-[80px]">
                            {cls.grade}{cls.letter}
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map(subject => (
                      <TableRow key={subject.id}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          {subject.name}
                        </TableCell>
                        {classes
                          .sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter))
                          .map(cls => {
                            const cell = distributionMatrix[subject.id]?.[cls.id];
                            if (!cell || cell.required === 0) {
                              return (
                                <TableCell key={cls.id} className="text-center">
                                  <span className="text-muted-foreground">—</span>
                                </TableCell>
                              );
                            }
                            const isFull = cell.assigned >= cell.required;
                            const isPartial = cell.assigned > 0 && cell.assigned < cell.required;
                            return (
                              <TableCell key={cls.id} className="text-center">
                                <div className={`text-xs ${isFull ? 'text-green-600' : isPartial ? 'text-amber-600' : 'text-destructive'}`}>
                                  {cell.assigned}/{cell.required}
                                </div>
                                {cell.teachers.length > 0 && (
                                  <div className="text-xs text-muted-foreground truncate max-w-[70px]">
                                    {cell.teachers.join(', ')}
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Все назначения</CardTitle>
              <CardDescription>
                Полный список назначений с возможностью удаления
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadAssignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Нет назначений. Используйте автораспределение или добавьте вручную.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Учитель</TableHead>
                      <TableHead>Предмет</TableHead>
                      <TableHead>Класс</TableHead>
                      <TableHead className="text-center">Часов</TableHead>
                      <TableHead className="text-center">Группа</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadAssignments.map(a => {
                      const teacher = teachers.find(t => t.id === a.teacherId);
                      const subject = subjects.find(s => s.id === a.subjectId);
                      const cls = classes.find(c => c.id === a.classId);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{teacher?.fullName || '—'}</TableCell>
                          <TableCell>{subject?.name || '—'}</TableCell>
                          <TableCell>{cls ? `${cls.grade}${cls.letter}` : '—'}</TableCell>
                          <TableCell className="text-center">{a.hoursPerWeek}</TableCell>
                          <TableCell className="text-center">
                            {a.isGroup ? (
                              <Badge variant="outline">Гр. {a.groupNumber}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                deleteLoadAssignment(a.id);
                                toast.success('Назначение удалено');
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
