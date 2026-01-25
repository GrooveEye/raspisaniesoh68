import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, SlidersHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import type { Teacher } from "@/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const emptyTeacher: Omit<Teacher, "id"> = {
  fullName: "",
  position: "Учитель",
  qualification: "без категории",
  subjects: [],
  minHours: 0,
  maxHours: 18,
  status: "штатный",
  primaryRoom: "",
  isUniversalRoom: false,
  preferredGrades: [],
};

export default function Teachers() {
  const { teachers, subjects, addTeacher, updateTeacher, deleteTeacher } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<Omit<Teacher, "id">>(emptyTeacher);
  const [subjectInput, setSubjectInput] = useState("");

  const grades = useMemo(() => Array.from({ length: 11 }, (_, i) => i + 1), []);

  type ColumnKey = "position" | "qualification" | "status" | "preferredGrades";

  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("teachersColumnVisibility") : null;
    if (raw) {
      try {
        return {
          position: false,
          qualification: false,
          status: false,
          preferredGrades: true,
          ...(JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>),
        };
      } catch {
        // ignore
      }
    }
    return { position: false, qualification: false, status: false, preferredGrades: true };
  });

  const updateColumnVisibility = (key: ColumnKey, value: boolean) => {
    setColumnVisibility((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("teachersColumnVisibility", JSON.stringify(next));
      return next;
    });
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subjects.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const rankedSubjectSuggestions = useMemo(() => {
    const q = subjectInput.trim().toLowerCase();

    const nameToArea = new Map(subjects.map((s) => [s.name.toLowerCase(), s.area]));
    const teacherAreas = formData.subjects
      .map((n) => nameToArea.get(n.toLowerCase()))
      .filter(Boolean) as string[];
    const teacherAreaSet = new Set(teacherAreas);

    const areaNeighbors: Record<string, string[]> = {
      "Математика и информатика": ["Естественнонаучные предметы", "Технология"],
      "Естественнонаучные предметы": ["Математика и информатика"],
      "Русский язык и литература": ["Иностранные языки", "Общественно-научные предметы"],
      "Иностранные языки": ["Русский язык и литература"],
      "Общественно-научные предметы": ["Русский язык и литература"],
      "Технология": ["Математика и информатика", "Искусство"],
      "Искусство": ["Технология"],
      "Физическая культура и ОБЖ": [],
    };

    const neighborSet = new Set<string>();
    for (const a of teacherAreaSet) {
      (areaNeighbors[a] ?? []).forEach((x) => neighborSet.add(x));
    }

    const score = (name: string, area: string) => {
      // 0 — своя область, 1 — смежная, 2 — любая другая
      const areaScore = teacherAreaSet.size === 0 ? 0 : teacherAreaSet.has(area) ? 0 : neighborSet.has(area) ? 1 : 2;
      // при вводе: начинающиеся с запроса — выше
      const nameLc = name.toLowerCase();
      const queryBoost = q ? (nameLc.startsWith(q) ? -1 : nameLc.includes(q) ? 0 : 10) : 0;
      return areaScore * 10 + queryBoost;
    };

    return subjects
      .filter((s) => !formData.subjects.includes(s.name))
      .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const sa = score(a.name, a.area);
        const sb = score(b.name, b.area);
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, "ru");
      })
      .slice(0, 5);
  }, [subjects, formData.subjects, subjectInput]);

  const tableColCount = useMemo(() => {
    // ФИО + Предметы + Мин + Макс + Действия = 5
    let count = 5;
    if (columnVisibility.position) count += 1;
    if (columnVisibility.qualification) count += 1;
    if (columnVisibility.status) count += 1;
    if (columnVisibility.preferredGrades) count += 1;
    return count;
  }, [columnVisibility]);

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
        primaryRoom: teacher.primaryRoom ?? "",
        isUniversalRoom: Boolean(teacher.isUniversalRoom),
        preferredGrades: teacher.preferredGrades ?? [],
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
                  <Label htmlFor="primaryRoom">Основной кабинет</Label>
                  <Input
                    id="primaryRoom"
                    value={formData.primaryRoom ?? ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, primaryRoom: e.target.value }))}
                    placeholder="101 / спортзал"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Универсальный кабинет</Label>
                  <div className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span className="text-sm text-muted-foreground">Работает в разных кабинетах</span>
                    <Checkbox
                      checked={Boolean(formData.isUniversalRoom)}
                      onCheckedChange={(v) =>
                        setFormData((prev) => ({ ...prev, isUniversalRoom: v === true }))
                      }
                    />
                  </div>
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
                <Label>Приоритетные параллели</Label>
                <p className="text-xs text-muted-foreground">
                  Укажите классы (1–11), где учителю предпочтительнее вести предмет (учитывается при распределении нагрузки).
                </p>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                  {grades.map((g) => {
                    const checked = (formData.preferredGrades ?? []).includes(g);
                    return (
                      <label
                        key={g}
                        className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const isOn = next === true;
                            setFormData((prev) => {
                              const current = prev.preferredGrades ?? [];
                              const updated = isOn
                                ? Array.from(new Set([...current, g])).sort((a, b) => a - b)
                                : current.filter((x) => x !== g);
                              return { ...prev, preferredGrades: updated };
                            });
                          }}
                        />
                        <span>{g}</span>
                      </label>
                    );
                  })}
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
                    {rankedSubjectSuggestions.map((subject) => (
                      <Badge
                        key={subject.id}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            subjects: [...prev.subjects, subject.name],
                          }))
                        }
                        title={subject.area}
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по ФИО или предмету..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Колонки
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Показать в таблице</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={columnVisibility.preferredGrades}
              onCheckedChange={(v) => updateColumnVisibility("preferredGrades", v === true)}
            >
              Приоритетные параллели
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.position}
              onCheckedChange={(v) => updateColumnVisibility("position", v === true)}
            >
              Должность
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.qualification}
              onCheckedChange={(v) => updateColumnVisibility("qualification", v === true)}
            >
              Квалификация
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={columnVisibility.status}
              onCheckedChange={(v) => updateColumnVisibility("status", v === true)}
            >
              Статус
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Всего: {teachers.length} учителей
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              {columnVisibility.position && <TableHead>Должность</TableHead>}
              {columnVisibility.qualification && <TableHead>Квалификация</TableHead>}
              <TableHead>Предметы</TableHead>
              <TableHead>Мин. часов</TableHead>
              <TableHead>Макс. часов</TableHead>
              {columnVisibility.preferredGrades && <TableHead>Приоритет</TableHead>}
              {columnVisibility.status && <TableHead>Статус</TableHead>}
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColCount} className="text-center py-8 text-muted-foreground">
                  {teachers.length === 0
                    ? "Нет добавленных учителей. Нажмите «Добавить учителя» для начала."
                    : "Ничего не найдено"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.fullName}</TableCell>
                  {columnVisibility.position && <TableCell>{teacher.position}</TableCell>}
                  {columnVisibility.qualification && (
                    <TableCell>
                      <Badge variant="secondary" className={getQualificationColor(teacher.qualification)}>
                        {teacher.qualification}
                      </Badge>
                    </TableCell>
                  )}
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
                  {columnVisibility.preferredGrades && (
                    <TableCell>
                      {(teacher.preferredGrades ?? []).length > 0
                        ? (teacher.preferredGrades ?? []).join(", ")
                        : "—"}
                    </TableCell>
                  )}
                  {columnVisibility.status && (
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(teacher.status)}>
                        {teacher.status}
                      </Badge>
                    </TableCell>
                  )}
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
