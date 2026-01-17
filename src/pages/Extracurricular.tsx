import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/context/AppContext";
import { toast } from "sonner";
import type { Extracurricular, ExtracurricularAssignment } from "@/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const directions: Extracurricular['direction'][] = [
  'спортивное',
  'творческое',
  'интеллектуальное',
  'социальное',
  'общекультурное'
];

const emptyExtracurricular: Omit<Extracurricular, 'id'> = {
  name: "",
  direction: "интеллектуальное",
  hoursPerWeek: 1,
  targetGrades: [],
  maxStudents: 15,
  isClassTeacherLed: false,
};

const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function ExtracurricularPage() {
  const { 
    extracurriculars, 
    addExtracurricular, 
    updateExtracurricular, 
    deleteExtracurricular,
    extracurricularAssignments,
    addExtracurricularAssignment,
    deleteExtracurricularAssignment,
    teachers,
    classes
  } = useApp();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Extracurricular | null>(null);
  const [formData, setFormData] = useState<Omit<Extracurricular, 'id'>>(emptyExtracurricular);

  // Диалог назначения учителя
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedExtracurricular, setSelectedExtracurricular] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedAssignGrades, setSelectedAssignGrades] = useState<number[]>([]);

  const filteredItems = extracurriculars.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.direction.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (item?: Extracurricular) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        direction: item.direction,
        hoursPerWeek: item.hoursPerWeek,
        targetGrades: [...item.targetGrades],
        maxStudents: item.maxStudents,
        isClassTeacherLed: item.isClassTeacherLed || false,
      });
    } else {
      setEditingItem(null);
      setFormData(emptyExtracurricular);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim() || formData.targetGrades.length === 0) return;

    if (editingItem) {
      updateExtracurricular(editingItem.id, formData);
    } else {
      addExtracurricular({ ...formData, id: generateId() });
    }
    setIsDialogOpen(false);
    setFormData(emptyExtracurricular);
    setEditingItem(null);
  };

  const handleGradeToggle = (grade: number) => {
    setFormData(prev => ({
      ...prev,
      targetGrades: prev.targetGrades.includes(grade)
        ? prev.targetGrades.filter(g => g !== grade)
        : [...prev.targetGrades, grade].sort((a, b) => a - b)
    }));
  };

  const selectAllGrades = (range: 'all' | '1-4' | '5-9' | '10-11') => {
    let selectedGrades: number[];
    switch (range) {
      case 'all':
        selectedGrades = [...grades];
        break;
      case '1-4':
        selectedGrades = [1, 2, 3, 4];
        break;
      case '5-9':
        selectedGrades = [5, 6, 7, 8, 9];
        break;
      case '10-11':
        selectedGrades = [10, 11];
        break;
    }
    setFormData(prev => ({ ...prev, targetGrades: selectedGrades }));
  };

  const getDirectionColor = (direction: Extracurricular['direction']) => {
    switch (direction) {
      case 'спортивное': return 'bg-green-100 text-green-800';
      case 'творческое': return 'bg-pink-100 text-pink-800';
      case 'интеллектуальное': return 'bg-purple-100 text-purple-800';
      case 'социальное': return 'bg-orange-100 text-orange-800';
      case 'общекультурное': return 'bg-blue-100 text-blue-800';
    }
  };

  const getDirectionIcon = (direction: Extracurricular['direction']) => {
    switch (direction) {
      case 'спортивное': return '🏃';
      case 'творческое': return '🎨';
      case 'интеллектуальное': return '🧠';
      case 'социальное': return '🤝';
      case 'общекультурное': return '🎭';
    }
  };

  const formatGrades = (targetGrades: number[]) => {
    if (targetGrades.length === 0) return "-";
    if (targetGrades.length === 11) return "1-11";
    
    const sorted = [...targetGrades].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        if (start === end) {
          ranges.push(start.toString());
        } else {
          ranges.push(`${start}-${end}`);
        }
        if (i < sorted.length) {
          start = sorted[i];
          end = sorted[i];
        }
      }
    }

    return ranges.join(", ");
  };

  // Назначения внеурочки
  const handleOpenAssignDialog = (extracurricularId?: string) => {
    setSelectedExtracurricular(extracurricularId || '');
    setSelectedTeacher('');
    setSelectedAssignGrades([]);
    setIsAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedExtracurricular || !selectedTeacher) {
      toast.error('Выберите курс и учителя');
      return;
    }

    const extracurricular = extracurriculars.find(e => e.id === selectedExtracurricular);
    if (!extracurricular) return;

    addExtracurricularAssignment({
      id: generateId(),
      teacherId: selectedTeacher,
      extracurricularId: selectedExtracurricular,
      targetGrades: selectedAssignGrades.length > 0 ? selectedAssignGrades : extracurricular.targetGrades,
      hoursPerWeek: extracurricular.hoursPerWeek,
    });

    setIsAssignDialogOpen(false);
    toast.success('Назначение добавлено');
  };

  // Подсчёт назначенных часов
  const getAssignmentsForExtracurricular = (extracurricularId: string) => {
    return extracurricularAssignments.filter(a => a.extracurricularId === extracurricularId);
  };

  // Курсы классного руководителя с автоматическими назначениями
  const classTeacherLedCourses = useMemo(() => {
    return extracurriculars.filter(e => e.isClassTeacherLed);
  }, [extracurriculars]);

  // Автоматические назначения для курсов классного руководителя
  const classTeacherAssignments = useMemo(() => {
    const assignments: { extracurricular: Extracurricular; cls: typeof classes[0]; teacher: typeof teachers[0] | null }[] = [];
    
    classTeacherLedCourses.forEach(course => {
      classes
        .filter(cls => course.targetGrades.includes(cls.grade))
        .forEach(cls => {
          const teacher = cls.classTeacherId ? teachers.find(t => t.id === cls.classTeacherId) : null;
          assignments.push({ extracurricular: course, cls, teacher });
        });
    });

    return assignments;
  }, [classTeacherLedCourses, classes, teachers]);

  // Группировка по направлениям
  const itemsByDirection = directions.map(direction => ({
    direction,
    items: filteredItems.filter(i => i.direction === direction),
    totalHours: filteredItems.filter(i => i.direction === direction).reduce((sum, i) => sum + i.hoursPerWeek, 0)
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Внеурочная деятельность</h1>
          <p className="text-muted-foreground">Кружки, секции и факультативы</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => handleOpenAssignDialog()}>
                <Users className="mr-2 h-4 w-4" />
                Назначить учителя
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Назначить учителя на внеурочку</DialogTitle>
                <DialogDescription>
                  Выберите курс и учителя. Можно указать конкретные параллели.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Курс внеурочки</Label>
                  <Select value={selectedExtracurricular} onValueChange={(v) => {
                    setSelectedExtracurricular(v);
                    const ext = extracurriculars.find(e => e.id === v);
                    if (ext) setSelectedAssignGrades(ext.targetGrades);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите курс" />
                    </SelectTrigger>
                    <SelectContent>
                      {extracurriculars.filter(e => !e.isClassTeacherLed).map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.hoursPerWeek} ч/нед)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Учитель</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите учителя" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedExtracurricular && (
                  <div className="space-y-2">
                    <Label>Параллели (для информации)</Label>
                    <div className="flex flex-wrap gap-2">
                      {grades.map(grade => {
                        const ext = extracurriculars.find(e => e.id === selectedExtracurricular);
                        const isAvailable = ext?.targetGrades.includes(grade);
                        if (!isAvailable) return null;
                        return (
                          <label
                            key={grade}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                              selectedAssignGrades.includes(grade)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'hover:bg-accent'
                            }`}
                          >
                            <Checkbox
                              checked={selectedAssignGrades.includes(grade)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAssignGrades(prev => [...prev, grade].sort((a, b) => a - b));
                                } else {
                                  setSelectedAssignGrades(prev => prev.filter(g => g !== grade));
                                }
                              }}
                              className="hidden"
                            />
                            {grade}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAssign} disabled={!selectedExtracurricular || !selectedTeacher}>
                  Назначить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Редактировать" : "Новая внеурочная деятельность"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Шахматы"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Направление</Label>
                    <Select 
                      value={formData.direction} 
                      onValueChange={(value: Extracurricular['direction']) => 
                        setFormData(prev => ({ ...prev, direction: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {directions.map(direction => (
                          <SelectItem key={direction} value={direction}>
                            {getDirectionIcon(direction)} {direction.charAt(0).toUpperCase() + direction.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours">Часов в неделю</Label>
                    <Input
                      id="hours"
                      type="number"
                      value={formData.hoursPerWeek}
                      onChange={(e) => setFormData(prev => ({ ...prev, hoursPerWeek: parseInt(e.target.value) || 1 }))}
                      min={1}
                      max={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Макс. учеников в группе</Label>
                  <Input
                    id="maxStudents"
                    type="number"
                    value={formData.maxStudents || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: parseInt(e.target.value) || undefined }))}
                    min={5}
                    max={30}
                    placeholder="Не ограничено"
                  />
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-0.5">
                    <Label>Ведёт классный руководитель</Label>
                    <p className="text-sm text-muted-foreground">
                      Курс автоматически назначается классному руководителю каждого класса (например, «Разговоры о важном»)
                    </p>
                  </div>
                  <Switch
                    checked={formData.isClassTeacherLed}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isClassTeacherLed: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Для классов *</Label>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => selectAllGrades('1-4')}>
                        1-4
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => selectAllGrades('5-9')}>
                        5-9
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => selectAllGrades('10-11')}>
                        10-11
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => selectAllGrades('all')}>
                        Все
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {grades.map(grade => (
                      <label
                        key={grade}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                          formData.targetGrades.includes(grade)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <Checkbox
                          checked={formData.targetGrades.includes(grade)}
                          onCheckedChange={() => handleGradeToggle(grade)}
                          className="hidden"
                        />
                        {grade}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.name.trim() || formData.targetGrades.length === 0}
                >
                  {editingItem ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Всего: {extracurriculars.length} занятий, {extracurriculars.reduce((sum, e) => sum + e.hoursPerWeek, 0)} ч/нед
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses">Курсы внеурочки</TabsTrigger>
          <TabsTrigger value="assignments">Назначения учителей</TabsTrigger>
          <TabsTrigger value="classTeacher">Курсы классного руководителя</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Направление</TableHead>
                  <TableHead>Часов/нед</TableHead>
                  <TableHead>Классы</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {extracurriculars.length === 0 
                        ? "Нет добавленной внеурочной деятельности. Нажмите «Добавить» для начала."
                        : "Ничего не найдено"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getDirectionColor(item.direction)}>
                          {getDirectionIcon(item.direction)} {item.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.hoursPerWeek} ч.</TableCell>
                      <TableCell>{formatGrades(item.targetGrades)}</TableCell>
                      <TableCell>
                        {item.isClassTeacherLed ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Кл. рук.
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Обычный</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteExtracurricular(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Назначения учителей на внеурочку</CardTitle>
              <CardDescription>
                Здесь отображаются назначения учителей на обычные курсы внеурочки (не классного руководителя)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {extracurricularAssignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Нет назначений. Нажмите «Назначить учителя» для добавления.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Курс</TableHead>
                      <TableHead>Учитель</TableHead>
                      <TableHead>Параллели</TableHead>
                      <TableHead className="text-center">Часов/нед</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extracurricularAssignments.map(a => {
                      const extracurricular = extracurriculars.find(e => e.id === a.extracurricularId);
                      const teacher = teachers.find(t => t.id === a.teacherId);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{extracurricular?.name || '—'}</TableCell>
                          <TableCell>{teacher?.fullName || '—'}</TableCell>
                          <TableCell>{formatGrades(a.targetGrades)}</TableCell>
                          <TableCell className="text-center">{a.hoursPerWeek}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                deleteExtracurricularAssignment(a.id);
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

        <TabsContent value="classTeacher">
          <Card>
            <CardHeader>
              <CardTitle>Курсы классного руководителя</CardTitle>
              <CardDescription>
                Эти курсы автоматически назначаются классному руководителю каждого класса. 
                Убедитесь, что у всех классов назначен классный руководитель в разделе «Классы».
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classTeacherLedCourses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Нет курсов с флагом «Ведёт классный руководитель». 
                  Добавьте курс и включите соответствующую опцию.
                </p>
              ) : (
                <div className="space-y-4">
                  {classTeacherLedCourses.map(course => (
                    <div key={course.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{course.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {course.hoursPerWeek} ч/нед • Классы: {formatGrades(course.targetGrades)}
                          </p>
                        </div>
                        <Badge variant="secondary" className={getDirectionColor(course.direction)}>
                          {getDirectionIcon(course.direction)} {course.direction}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {classTeacherAssignments
                          .filter(a => a.extracurricular.id === course.id)
                          .map(({ cls, teacher }) => (
                            <div 
                              key={cls.id} 
                              className={`text-sm p-2 rounded border ${
                                teacher ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                              }`}
                            >
                              <span className="font-medium">{cls.grade}{cls.letter}</span>
                              <span className="text-muted-foreground"> → </span>
                              {teacher ? (
                                <span className="text-green-700">{teacher.fullName.split(' ')[0]}</span>
                              ) : (
                                <span className="text-amber-600">Нет кл. рук.</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Сводка по направлениям */}
      {itemsByDirection.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {itemsByDirection.map(({ direction, items, totalHours }) => (
            <div key={direction} className="border rounded-lg p-4">
              <div className="text-2xl mb-1">{getDirectionIcon(direction)}</div>
              <div className="font-medium capitalize">{direction}</div>
              <div className="text-sm text-muted-foreground">
                {items.length} занятий • {totalHours} ч/нед
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
