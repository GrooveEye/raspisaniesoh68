import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { useApp } from "@/context/AppContext";
import type { Teacher } from "@/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const emptyTeacher: Omit<Teacher, 'id'> = {
  fullName: "",
  position: "Учитель",
  qualification: "без категории",
  subjects: [],
  minHours: 0,
  maxHours: 18,
  status: "штатный",
};

export default function Teachers() {
  const { teachers, subjects, addTeacher, updateTeacher, deleteTeacher } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<Omit<Teacher, 'id'>>(emptyTeacher);
  const [subjectInput, setSubjectInput] = useState("");

  const filteredTeachers = teachers.filter(teacher =>
    teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenDialog = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        fullName: teacher.fullName,
        position: teacher.position,
        qualification: teacher.qualification,
        subjects: teacher.subjects,
        minHours: teacher.minHours,
        maxHours: teacher.maxHours,
        status: teacher.status,
      });
    } else {
      setEditingTeacher(null);
      setFormData(emptyTeacher);
    }
    setSubjectInput("");
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.fullName.trim()) return;

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, formData);
    } else {
      addTeacher({ ...formData, id: generateId() });
    }
    setIsDialogOpen(false);
    setFormData(emptyTeacher);
    setEditingTeacher(null);
  };

  const handleAddSubject = () => {
    if (subjectInput.trim() && !formData.subjects.includes(subjectInput.trim())) {
      setFormData(prev => ({
        ...prev,
        subjects: [...prev.subjects, subjectInput.trim()]
      }));
      setSubjectInput("");
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subject)
    }));
  };

  const getStatusColor = (status: Teacher['status']) => {
    switch (status) {
      case 'штатный': return 'bg-green-100 text-green-800';
      case 'внешний совместитель': return 'bg-orange-100 text-orange-800';
      case 'внутренний совместитель': return 'bg-blue-100 text-blue-800';
    }
  };

  const getQualificationColor = (qual: Teacher['qualification']) => {
    switch (qual) {
      case 'высшая': return 'bg-purple-100 text-purple-800';
      case 'первая': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Учителя</h1>
          <p className="text-muted-foreground">Управление педагогическим составом</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить учителя
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? "Редактировать учителя" : "Новый учитель"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">ФИО *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Иванов Иван Иванович"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Должность</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Учитель"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Квалификация</Label>
                  <Select 
                    value={formData.qualification} 
                    onValueChange={(value: Teacher['qualification']) => 
                      setFormData(prev => ({ ...prev, qualification: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="без категории">Без категории</SelectItem>
                      <SelectItem value="первая">Первая категория</SelectItem>
                      <SelectItem value="высшая">Высшая категория</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: Teacher['status']) => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="штатный">Штатный</SelectItem>
                      <SelectItem value="внутренний совместитель">Внутренний совместитель</SelectItem>
                      <SelectItem value="внешний совместитель">Внешний совместитель</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minHours">Мин. часов в неделю</Label>
                  <Input
                    id="minHours"
                    type="number"
                    value={formData.minHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, minHours: parseInt(e.target.value) || 0 }))}
                    min={0}
                    max={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxHours">Макс. часов в неделю</Label>
                  <Input
                    id="maxHours"
                    type="number"
                    value={formData.maxHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxHours: parseInt(e.target.value) || 0 }))}
                    min={1}
                    max={40}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Предметы</Label>
                <div className="flex gap-2">
                  <Input
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="Название предмета"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubject())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddSubject}>
                    Добавить
                  </Button>
                </div>
                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {subjects.filter(s => !formData.subjects.includes(s.name)).slice(0, 5).map(subject => (
                      <Badge
                        key={subject.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          subjects: [...prev.subjects, subject.name]
                        }))}
                      >
                        + {subject.name}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.subjects.map(subject => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => handleRemoveSubject(subject)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={!formData.fullName.trim()}>
                {editingTeacher ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ФИО или предмету..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Всего: {teachers.length} учителей
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>Должность</TableHead>
              <TableHead>Квалификация</TableHead>
              <TableHead>Предметы</TableHead>
              <TableHead>Мин. часов</TableHead>
              <TableHead>Макс. часов</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {teachers.length === 0 
                    ? "Нет добавленных учителей. Нажмите «Добавить учителя» для начала."
                    : "Ничего не найдено"
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.fullName}</TableCell>
                  <TableCell>{teacher.position}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getQualificationColor(teacher.qualification)}>
                      {teacher.qualification}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.slice(0, 3).map(subject => (
                        <Badge key={subject} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {teacher.subjects.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{teacher.subjects.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{teacher.minHours} ч.</TableCell>
                  <TableCell>{teacher.maxHours} ч.</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getStatusColor(teacher.status)}>
                      {teacher.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(teacher)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTeacher(teacher.id)}
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
    </div>
  );
}
