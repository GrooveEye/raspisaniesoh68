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
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/context/AppContext";
import type { Extracurricular } from "@/types";

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
};

const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function ExtracurricularPage() {
  const { extracurriculars, addExtracurricular, updateExtracurricular, deleteExtracurricular } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Extracurricular | null>(null);
  const [formData, setFormData] = useState<Omit<Extracurricular, 'id'>>(emptyExtracurricular);

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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Направление</TableHead>
              <TableHead>Часов/нед</TableHead>
              <TableHead>Классы</TableHead>
              <TableHead>Макс. учеников</TableHead>
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
                  <TableCell>{item.maxStudents || "—"}</TableCell>
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
