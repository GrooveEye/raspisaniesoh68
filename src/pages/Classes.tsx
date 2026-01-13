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
import type { SchoolClass } from "@/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const emptyClass: Omit<SchoolClass, 'id'> = {
  grade: 1,
  letter: "А",
  studentCount: 25,
  profile: "общеобразовательный",
};

const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const letters = ["А", "Б", "В", "Г", "Д", "Е", "Ж", "З"];

export default function Classes() {
  const { classes, addClass, updateClass, deleteClass } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [formData, setFormData] = useState<Omit<SchoolClass, 'id'>>(emptyClass);

  const filteredClasses = classes
    .filter(cls =>
      `${cls.grade}${cls.letter}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.profile.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));

  const handleOpenDialog = (schoolClass?: SchoolClass) => {
    if (schoolClass) {
      setEditingClass(schoolClass);
      setFormData({
        grade: schoolClass.grade,
        letter: schoolClass.letter,
        studentCount: schoolClass.studentCount,
        profile: schoolClass.profile,
      });
    } else {
      setEditingClass(null);
      setFormData(emptyClass);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingClass) {
      updateClass(editingClass.id, formData);
    } else {
      addClass({ ...formData, id: generateId() });
    }
    setIsDialogOpen(false);
    setFormData(emptyClass);
    setEditingClass(null);
  };

  const getProfileColor = (profile: SchoolClass['profile']) => {
    switch (profile) {
      case 'гуманитарный': return 'bg-pink-100 text-pink-800';
      case 'технический': return 'bg-blue-100 text-blue-800';
      case 'естественнонаучный': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeLevel = (grade: number) => {
    if (grade <= 4) return 'Начальное';
    if (grade <= 9) return 'Основное';
    return 'Среднее';
  };

  // Группировка по параллелям
  const classesByGrade = grades.map(grade => ({
    grade,
    classes: filteredClasses.filter(c => c.grade === grade),
    totalStudents: filteredClasses.filter(c => c.grade === grade).reduce((sum, c) => sum + c.studentCount, 0)
  })).filter(g => g.classes.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Классы</h1>
          <p className="text-muted-foreground">Управление классами и параллелями</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить класс
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Редактировать класс" : "Новый класс"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Параллель (класс)</Label>
                  <Select 
                    value={formData.grade.toString()} 
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, grade: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map(grade => (
                        <SelectItem key={grade} value={grade.toString()}>
                          {grade} класс
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Буква</Label>
                  <Select 
                    value={formData.letter} 
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, letter: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {letters.map(letter => (
                        <SelectItem key={letter} value={letter}>
                          {letter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentCount">Количество учеников</Label>
                <Input
                  id="studentCount"
                  type="number"
                  value={formData.studentCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, studentCount: parseInt(e.target.value) || 0 }))}
                  min={1}
                  max={40}
                />
              </div>

              <div className="space-y-2">
                <Label>Профиль класса</Label>
                <Select 
                  value={formData.profile} 
                  onValueChange={(value: SchoolClass['profile']) => 
                    setFormData(prev => ({ ...prev, profile: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="общеобразовательный">Общеобразовательный</SelectItem>
                    <SelectItem value="гуманитарный">Гуманитарный</SelectItem>
                    <SelectItem value="технический">Технический</SelectItem>
                    <SelectItem value="естественнонаучный">Естественнонаучный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave}>
                {editingClass ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по классу или профилю..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Всего: {classes.length} классов, {classes.reduce((sum, c) => sum + c.studentCount, 0)} учеников
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Класс</TableHead>
              <TableHead>Ступень</TableHead>
              <TableHead>Количество учеников</TableHead>
              <TableHead>Профиль</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClasses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {classes.length === 0 
                    ? "Нет добавленных классов. Нажмите «Добавить класс» для начала."
                    : "Ничего не найдено"
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredClasses.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium text-lg">
                    {cls.grade}{cls.letter}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getGradeLevel(cls.grade)}
                    </Badge>
                  </TableCell>
                  <TableCell>{cls.studentCount} чел.</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getProfileColor(cls.profile)}>
                      {cls.profile}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(cls)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteClass(cls.id)}
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

      {/* Сводка по параллелям */}
      {classesByGrade.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {classesByGrade.map(({ grade, classes: gradeClasses, totalStudents }) => (
            <div key={grade} className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{grade}</div>
              <div className="text-sm text-muted-foreground">параллель</div>
              <div className="mt-2 text-sm">
                <span className="font-medium">{gradeClasses.length}</span> кл. / 
                <span className="font-medium"> {totalStudents}</span> уч.
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
