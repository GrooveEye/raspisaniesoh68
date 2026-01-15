import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Нормы СанПиН по максимальной недельной нагрузке
const SANPIN_MAX_HOURS: Record<number, number> = {
  1: 21,
  2: 23,
  3: 23,
  4: 23,
  5: 29,
  6: 30,
  7: 32,
  8: 33,
  9: 33,
  10: 34,
  11: 34,
};

export default function Curriculum() {
  const { classes, subjects } = useApp();
  const [selectedGrade, setSelectedGrade] = useState<string>('all');

  // Группировка классов по параллелям
  const classesByGrade = useMemo(() => {
    const grouped: Record<number, typeof classes> = {};
    classes.forEach(cls => {
      if (!grouped[cls.grade]) {
        grouped[cls.grade] = [];
      }
      grouped[cls.grade].push(cls);
    });
    // Сортировка по буквам внутри каждой параллели
    Object.keys(grouped).forEach(grade => {
      grouped[Number(grade)].sort((a, b) => a.letter.localeCompare(b.letter));
    });
    return grouped;
  }, [classes]);

  // Получить уникальные параллели
  const grades = useMemo(() => {
    return Object.keys(classesByGrade).map(Number).sort((a, b) => a - b);
  }, [classesByGrade]);

  // Фильтрация классов по выбранной параллели
  const filteredClasses = useMemo(() => {
    if (selectedGrade === 'all') {
      return classes.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));
    }
    return classesByGrade[Number(selectedGrade)] || [];
  }, [selectedGrade, classes, classesByGrade]);

  // Расчёт часов для класса по предмету
  const getSubjectHours = (subject: typeof subjects[0], grade: number, studentCount: number) => {
    const baseHours = subject.hoursPerWeek[grade] || 0;
    // Если требуется деление на группы и количество учеников превышает порог
    if (subject.requiresGroupSplit && subject.groupSplitThreshold && studentCount > subject.groupSplitThreshold) {
      return baseHours * 2; // Удвоение часов для двух групп
    }
    return baseHours;
  };

  // Общая нагрузка по классу
  const getTotalHours = (cls: typeof classes[0]) => {
    return subjects.reduce((total, subject) => {
      return total + getSubjectHours(subject, cls.grade, cls.studentCount);
    }, 0);
  };

  // Проверка соответствия СанПиН
  const checkSanpin = (cls: typeof classes[0]) => {
    const totalHours = getTotalHours(cls);
    const maxHours = SANPIN_MAX_HOURS[cls.grade] || 34;
    return {
      total: totalHours,
      max: maxHours,
      isValid: totalHours <= maxHours,
      overflow: totalHours - maxHours,
    };
  };

  // Статистика по учебному плану
  const stats = useMemo(() => {
    const violations = filteredClasses.filter(cls => !checkSanpin(cls).isValid);
    const totalHoursAll = filteredClasses.reduce((sum, cls) => sum + getTotalHours(cls), 0);
    return {
      classCount: filteredClasses.length,
      subjectCount: subjects.length,
      violations: violations.length,
      totalHours: totalHoursAll,
    };
  }, [filteredClasses, subjects]);

  // Сводка по предметным областям
  const areasSummary = useMemo(() => {
    const areas: Record<string, { subjects: string[]; totalHours: number }> = {};
    subjects.forEach(subject => {
      if (!areas[subject.area]) {
        areas[subject.area] = { subjects: [], totalHours: 0 };
      }
      areas[subject.area].subjects.push(subject.name);
      // Считаем часы по всем параллелям
      const subjectHours = Object.values(subject.hoursPerWeek).reduce((a, b) => a + b, 0);
      areas[subject.area].totalHours += subjectHours;
    });
    return areas;
  }, [subjects]);

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Учебный план</h1>
          <p className="text-muted-foreground">Формирование учебного плана школы</p>
        </div>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Недостаточно данных</AlertTitle>
          <AlertDescription>
            Для формирования учебного плана необходимо добавить классы и предметы в соответствующих справочниках.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Учебный план</h1>
        <p className="text-muted-foreground">Формирование учебного плана школы по ФГОС</p>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Классов</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.classCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Предметов</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subjectCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего часов</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Нарушения СанПиН</CardTitle>
            {stats.violations > 0 ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.violations > 0 ? 'text-destructive' : 'text-green-500'}`}>
              {stats.violations}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plan" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plan">Учебный план</TabsTrigger>
          <TabsTrigger value="areas">По предметным областям</TabsTrigger>
          <TabsTrigger value="sanpin">Контроль СанПиН</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="space-y-4">
          {/* Фильтр по параллели */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Параллель:</span>
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={selectedGrade === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedGrade('all')}
              >
                Все
              </Badge>
              {grades.map(grade => (
                <Badge
                  key={grade}
                  variant={selectedGrade === String(grade) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedGrade(String(grade))}
                >
                  {grade} класс
                </Badge>
              ))}
            </div>
          </div>

          {/* Таблица учебного плана */}
          <Card>
            <CardHeader>
              <CardTitle>Учебный план {selectedGrade !== 'all' ? `${selectedGrade} класса` : 'школы'}</CardTitle>
              <CardDescription>
                Количество часов в неделю по предметам и классам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background min-w-[200px]">Предмет</TableHead>
                      {filteredClasses.map(cls => (
                        <TableHead key={cls.id} className="text-center min-w-[60px]">
                          {cls.grade}{cls.letter}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map(subject => (
                      <TableRow key={subject.id}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          <div className="flex items-center gap-2">
                            {subject.name}
                            {subject.requiresGroupSplit && (
                              <Badge variant="secondary" className="text-xs">÷</Badge>
                            )}
                          </div>
                        </TableCell>
                        {filteredClasses.map(cls => {
                          const hours = getSubjectHours(subject, cls.grade, cls.studentCount);
                          const baseHours = subject.hoursPerWeek[cls.grade] || 0;
                          const isDoubled = hours > baseHours;
                          return (
                            <TableCell key={cls.id} className="text-center">
                              {hours > 0 ? (
                                <span className={isDoubled ? 'text-blue-600 font-medium' : ''}>
                                  {hours}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {/* Итого */}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell className="sticky left-0 bg-muted/50">ИТОГО</TableCell>
                      {filteredClasses.map(cls => {
                        const sanpin = checkSanpin(cls);
                        return (
                          <TableCell key={cls.id} className="text-center">
                            <span className={!sanpin.isValid ? 'text-destructive' : ''}>
                              {sanpin.total}
                            </span>
                            <span className="text-xs text-muted-foreground">/{sanpin.max}</span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="text-sm text-muted-foreground space-y-1">
            <p><Badge variant="secondary" className="text-xs mr-1">÷</Badge> — предмет с делением на группы</p>
            <p><span className="text-blue-600 font-medium">Синим</span> — часы удвоены из-за деления на группы</p>
          </div>
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Распределение по предметным областям</CardTitle>
              <CardDescription>
                Группировка предметов по образовательным областям
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(areasSummary).map(([area, data]) => (
                  <Card key={area}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{area}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {data.subjects.map(subject => (
                            <Badge key={subject} variant="outline" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Всего часов (сумма по параллелям): <strong>{data.totalHours}</strong>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sanpin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Контроль соответствия СанПиН</CardTitle>
              <CardDescription>
                Проверка максимальной недельной нагрузки учащихся
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Класс</TableHead>
                    <TableHead>Профиль</TableHead>
                    <TableHead className="text-right">Фактическая нагрузка</TableHead>
                    <TableHead className="text-right">Норма СанПиН</TableHead>
                    <TableHead className="text-center">Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes
                    .sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter))
                    .map(cls => {
                      const sanpin = checkSanpin(cls);
                      return (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.grade}{cls.letter}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{cls.profile}</Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${!sanpin.isValid ? 'text-destructive' : ''}`}>
                            {sanpin.total} ч.
                          </TableCell>
                          <TableCell className="text-right">{sanpin.max} ч.</TableCell>
                          <TableCell className="text-center">
                            {sanpin.isValid ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Норма
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                +{sanpin.overflow} ч.
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Нормы СанПиН</CardTitle>
              <CardDescription>
                Максимально допустимая недельная нагрузка учащихся
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 md:grid-cols-11 gap-2">
                {Object.entries(SANPIN_MAX_HOURS).map(([grade, hours]) => (
                  <div key={grade} className="text-center p-2 rounded-lg bg-muted">
                    <div className="text-xs text-muted-foreground">{grade} кл.</div>
                    <div className="font-bold">{hours}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
