import { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  FileJson, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  Users,
  School,
  BookOpen,
  Sparkles,
  FileDown,
  Table as TableIcon
} from 'lucide-react';
import {
  exportToJSON,
  parseJSONFile,
  exportTeachersToExcel,
  exportClassesToExcel,
  exportSubjectsToExcel,
  exportExtracurricularsToExcel,
  exportDistributionToExcel,
  exportAllToExcel,
  exportTeachersToCSV,
  exportClassesToCSV,
  exportSubjectsToCSV,
  exportExtracurricularsToCSV,
  exportCurriculumPlanToExcel,
  exportCurriculumPlanToCSV,
  parseExcelFile,
  parseCSVFile,
  parseTeachersFromData,
  parseClassesFromData,
  parseSubjectsFromData,
  parseExtracurricularsFromData,
  parseCurriculumPlanFromData
} from '@/lib/exportUtils';

type ImportType = 'teachers' | 'classes' | 'subjects' | 'extracurriculars' | 'curriculum' | 'full';

interface ImportPreview {
  type: ImportType;
  data: any;
  fileName: string;
}

export default function ImportExport() {
  const { 
    teachers, 
    classes, 
    subjects, 
    extracurriculars,
    loadAssignments,
    extracurricularAssignments,
    curriculumPlan,
    importData,
    addTeacher,
    addClass,
    addSubject,
    addExtracurricular,
    clearAllData
  } = useApp();
  const { toast } = useToast();
  
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentImportType, setCurrentImportType] = useState<ImportType>('teachers');
  
  // Статистика данных
  const stats = {
    teachers: teachers.length,
    classes: classes.length,
    subjects: subjects.length,
    extracurriculars: extracurriculars.length,
    loadAssignments: loadAssignments.length,
    extracurricularAssignments: extracurricularAssignments.length
  };
  
  const handleFileSelect = (type: ImportType) => {
    setCurrentImportType(type);
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const fileName = file.name.toLowerCase();
      let rawData: any;
      
      if (fileName.endsWith('.json')) {
        rawData = await parseJSONFile(file);
        
        if (currentImportType === 'full') {
          // Полный импорт из JSON
          setImportPreview({
            type: 'full',
            data: rawData,
            fileName: file.name
          });
        } else {
          toast({
            title: 'Неподдерживаемый формат',
            description: 'JSON файлы поддерживаются только для полного импорта',
            variant: 'destructive'
          });
          return;
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        rawData = await parseExcelFile(file);
        processTabularData(rawData, file.name);
      } else if (fileName.endsWith('.csv')) {
        rawData = await parseCSVFile(file);
        processTabularData(rawData, file.name);
      } else {
        toast({
          title: 'Неподдерживаемый формат',
          description: 'Поддерживаются файлы: Excel (.xlsx, .xls), CSV (.csv), JSON (.json)',
          variant: 'destructive'
        });
        return;
      }
      
      setIsPreviewOpen(true);
    } catch (error) {
      toast({
        title: 'Ошибка чтения файла',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive'
      });
    }
    
    // Сбрасываем input для возможности повторного выбора того же файла
    e.target.value = '';
  };
  
  const processTabularData = (data: any[][], fileName: string) => {
    let parsedData: any[] = [];

    switch (currentImportType) {
      case 'teachers':
        parsedData = parseTeachersFromData(data);
        break;
      case 'classes':
        parsedData = parseClassesFromData(data);
        break;
      case 'subjects':
        parsedData = parseSubjectsFromData(data);
        break;
      case 'extracurriculars':
        parsedData = parseExtracurricularsFromData(data);
        break;
      case 'curriculum':
        parsedData = parseCurriculumPlanFromData(data);
        break;
    }

    if (parsedData.length === 0) {
      toast({
        title: 'Нет данных для импорта',
        description: 'Файл не содержит данных или формат не распознан',
        variant: 'destructive'
      });
      return;
    }

    setImportPreview({
      type: currentImportType,
      data: parsedData,
      fileName
    });
  };
  
  const confirmImport = async () => {
    if (!importPreview) return;

    setIsImporting(true);

    try {
      if (importPreview.type === 'full') {
        // Полный импорт из JSON
        importData(importPreview.data);
        toast({
          title: 'Импорт завершён',
          description: 'Все данные успешно импортированы'
        });
      } else if (importPreview.type === 'curriculum') {
        // Импорт учебного плана (предмет + класс + часы)
        const normalize = (s: string) => s.replace(/\s+/g, '').replace(/[\.\-]/g, '').toLowerCase();

        const subjectByName = new Map(subjects.map(s => [normalize(s.name), s] as const));
        const classByName = new Map(classes.map(c => [normalize(`${c.grade}${c.letter}`), c] as const));

        const plan: Record<string, number> = {};
        for (const row of importPreview.data as Array<{ subjectName: string; className: string; hoursPerWeek: number }>) {
          const subj = subjectByName.get(normalize(row.subjectName));
          const cls = classByName.get(normalize(row.className));
          if (!subj || !cls) continue;
          const key = `${subj.id}_${cls.id}`;
          plan[key] = Number(row.hoursPerWeek) || 0;
        }

        importData({ curriculumPlan: plan });

        toast({
          title: 'Импорт завершён',
          description: `Добавлено/обновлено ячеек: ${Object.keys(plan).length}`
        });
      } else {
        // Импорт отдельного типа
        const generateId = () => crypto.randomUUID();

        switch (importPreview.type) {
          case 'teachers':
            importPreview.data.forEach(t => addTeacher({ ...t, id: generateId() }));
            break;
          case 'classes':
            importPreview.data.forEach(c => addClass({ ...c, id: generateId() }));
            break;
          case 'subjects':
            importPreview.data.forEach(s => addSubject({ ...s, id: generateId() }));
            break;
          case 'extracurriculars':
            importPreview.data.forEach(e => addExtracurricular({ ...e, id: generateId() }));
            break;
        }

        toast({
          title: 'Импорт завершён',
          description: `Добавлено записей: ${importPreview.data.length}`
        });
      }

      setIsPreviewOpen(false);
      setImportPreview(null);
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleClearAll = () => {
    clearAllData();
    setIsClearDialogOpen(false);
    toast({
      title: 'Данные очищены',
      description: 'Все данные приложения были удалены'
    });
  };
  
  const renderPreviewTable = () => {
    if (!importPreview) return null;
    
    if (importPreview.type === 'full') {
      const data = importPreview.data;
      return (
        <div className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Полный импорт данных</AlertTitle>
            <AlertDescription>
              Учителей: {data.teachers?.length || 0}, 
              Классов: {data.classes?.length || 0}, 
              Предметов: {data.subjects?.length || 0}, 
              Внеурочка: {data.extracurriculars?.length || 0}
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    const data = importPreview.data;
    
    if (importPreview.type === 'teachers') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>Должность</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead>Предметы</TableHead>
              <TableHead>Часы</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((t: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{t.fullName}</TableCell>
                <TableCell>{t.position}</TableCell>
                <TableCell><Badge variant="outline">{t.qualification}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate">{t.subjects?.join(', ')}</TableCell>
                <TableCell>{t.minHours}-{t.maxHours}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    
    if (importPreview.type === 'classes') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Класс</TableHead>
              <TableHead>Учеников</TableHead>
              <TableHead>Профиль</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((c: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{c.grade}{c.letter}</TableCell>
                <TableCell>{c.studentCount}</TableCell>
                <TableCell><Badge variant="outline">{c.profile}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    
    if (importPreview.type === 'subjects') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Область</TableHead>
              <TableHead>Деление</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((s: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.area}</TableCell>
                <TableCell>{s.requiresGroupSplit ? 'Да' : 'Нет'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    
    if (importPreview.type === 'extracurriculars') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Направление</TableHead>
              <TableHead>Часов</TableHead>
              <TableHead>Параллели</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((e: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell><Badge variant="outline">{e.direction}</Badge></TableCell>
                <TableCell>{e.hoursPerWeek}</TableCell>
                <TableCell>{e.targetGrades?.join(', ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    if (importPreview.type === 'curriculum') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Предмет</TableHead>
              <TableHead>Класс</TableHead>
              <TableHead>Часов/нед</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 10).map((r: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{r.subjectName}</TableCell>
                <TableCell>{r.className}</TableCell>
                <TableCell>{r.hoursPerWeek}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    return null;
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Импорт / Экспорт</h1>
          <p className="text-muted-foreground">
            Загрузка и выгрузка данных в различных форматах
          </p>
        </div>
        <Button variant="destructive" onClick={() => setIsClearDialogOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Очистить все данные
        </Button>
      </div>
      
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Учителя</span>
            </div>
            <p className="text-2xl font-bold">{stats.teachers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <School className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Классы</span>
            </div>
            <p className="text-2xl font-bold">{stats.classes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Предметы</span>
            </div>
            <p className="text-2xl font-bold">{stats.subjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Внеурочка</span>
            </div>
            <p className="text-2xl font-bold">{stats.extracurriculars}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Назначения</span>
            </div>
            <p className="text-2xl font-bold">{stats.loadAssignments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Назн. внеурочки</span>
            </div>
            <p className="text-2xl font-bold">{stats.extracurricularAssignments}</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Импорт
          </TabsTrigger>
        </TabsList>
        
        {/* Экспорт */}
        <TabsContent value="export" className="space-y-6">
          {/* Полный экспорт */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Полный экспорт данных
              </CardTitle>
              <CardDescription>
                Экспорт всех данных системы в один файл
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
              <Button 
                onClick={() => exportToJSON({
                  teachers, classes, subjects, extracurriculars,
                  loadAssignments, extracurricularAssignments, curriculumPlan
                })}
                variant="outline"
              >
                <FileJson className="mr-2 h-4 w-4" />
                Экспорт в JSON
              </Button>
              <Button 
                onClick={() => exportAllToExcel(
                  teachers, classes, subjects, extracurriculars,
                  loadAssignments, extracurricularAssignments, curriculumPlan
                )}
                variant="outline"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Экспорт в Excel (все листы)
              </Button>
            </CardContent>
          </Card>
          
          {/* Экспорт распределения */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Экспорт распределения нагрузки
              </CardTitle>
              <CardDescription>
                Таблица распределения учебной нагрузки по учителям и классам (как на образце)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => exportDistributionToExcel(
                  teachers, classes, subjects, extracurriculars,
                  loadAssignments, extracurricularAssignments
                )}
                disabled={loadAssignments.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Экспорт распределения в Excel
              </Button>
              {loadAssignments.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Сначала выполните распределение нагрузки
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Экспорт по категориям */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Учителя ({teachers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => exportTeachersToExcel(teachers)} disabled={teachers.length === 0}>
                  <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportTeachersToCSV(teachers)} disabled={teachers.length === 0}>
                  <FileText className="mr-1 h-3 w-3" /> CSV
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Классы ({classes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => exportClassesToExcel(classes, teachers)} disabled={classes.length === 0}>
                  <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportClassesToCSV(classes, teachers)} disabled={classes.length === 0}>
                  <FileText className="mr-1 h-3 w-3" /> CSV
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Предметы ({subjects.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => exportSubjectsToExcel(subjects)} disabled={subjects.length === 0}>
                  <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportSubjectsToCSV(subjects)} disabled={subjects.length === 0}>
                  <FileText className="mr-1 h-3 w-3" /> CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Учебный план
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCurriculumPlanToExcel(subjects, classes, curriculumPlan)}
                  disabled={Object.keys(curriculumPlan).length === 0}
                >
                  <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportCurriculumPlanToCSV(subjects, classes, curriculumPlan)}
                  disabled={Object.keys(curriculumPlan).length === 0}
                >
                  <FileText className="mr-1 h-3 w-3" /> CSV
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Внеурочка ({extracurriculars.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => exportExtracurricularsToExcel(extracurriculars)} disabled={extracurriculars.length === 0}>
                  <FileSpreadsheet className="mr-1 h-3 w-3" /> Excel
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportExtracurricularsToCSV(extracurriculars)} disabled={extracurriculars.length === 0}>
                  <FileText className="mr-1 h-3 w-3" /> CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Импорт */}
        <TabsContent value="import" className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Формат файлов для импорта</AlertTitle>
            <AlertDescription>
              Поддерживаются файлы Excel (.xlsx, .xls), CSV (.csv) и JSON (.json). 
              Первая строка должна содержать заголовки столбцов. 
              Данные добавляются к существующим (не заменяют их).
            </AlertDescription>
          </Alert>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.json"
            className="hidden"
          />
          
          {/* Полный импорт */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Полный импорт из JSON
              </CardTitle>
              <CardDescription>
                Импорт всех данных из ранее экспортированного JSON файла
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => handleFileSelect('full')}>
                <Upload className="mr-2 h-4 w-4" />
                Выбрать JSON файл
              </Button>
            </CardContent>
          </Card>
          
          {/* Импорт по категориям */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Импорт учителей
                </CardTitle>
                <CardDescription>
                  Столбцы: ФИО, Должность, Категория, Предметы, Мин. часов, Макс. часов, Статус
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => handleFileSelect('teachers')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать файл
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Импорт классов
                </CardTitle>
                <CardDescription>
                  Столбцы: Класс (или Параллель + Буква), Количество учеников, Профиль
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => handleFileSelect('classes')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать файл
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Импорт предметов
                </CardTitle>
                <CardDescription>
                  Столбцы: Название, Предметная область, Деление на группы, Порог деления
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => handleFileSelect('subjects')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать файл
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Импорт внеурочки
                </CardTitle>
                <CardDescription>
                  Столбцы: Название, Направление, Часов в неделю, Параллели, Макс. учеников
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => handleFileSelect('extracurriculars')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать файл
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Импорт учебного плана
                </CardTitle>
                <CardDescription>
                  Столбцы: Предмет, Класс, Часов в неделю (пример: Алгебра | 9А | 3)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => handleFileSelect('curriculum')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Выбрать файл
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Диалог предпросмотра импорта */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Предпросмотр импорта</DialogTitle>
            <DialogDescription>
              Файл: {importPreview?.fileName} | Записей: {importPreview?.data?.length || 0}
              {importPreview?.data?.length > 10 && ' (показаны первые 10)'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[50vh]">
            {renderPreviewTable()}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Отмена
            </Button>
            <Button onClick={confirmImport} disabled={isImporting}>
              {isImporting ? 'Импорт...' : 'Подтвердить импорт'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Диалог очистки данных */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Очистить все данные?
            </DialogTitle>
            <DialogDescription>
              Это действие удалит все данные: учителей, классы, предметы, внеурочку, 
              распределение нагрузки и учебный план. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Да, очистить всё
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
