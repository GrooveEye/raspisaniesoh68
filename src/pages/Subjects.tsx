import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Users, Anchor } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/AppContext";
import type { Subject } from "@/types";
import { AnchorsManagerDialog } from "@/components/schedule/AnchorsManagerDialog";
import { SectionImportExportActions } from "@/components/importExport/SectionImportExportActions";
import { exportSubjectsToExcel, parseSubjectsFromData } from "@/lib/exportUtils";

const generateId = () => Math.random().toString(36).substr(2, 9);

const subjectAreas = [
  "Русский язык и литература",
  "Иностранные языки",
  "Математика и информатика",
  "Общественно-научные предметы",
  "Естественнонаучные предметы",
  "Искусство",
  "Технология",
  "Физическая культура и ОБЖ",
];

const emptySubject: Omit<Subject, 'id'> = {
  name: "",
  area: subjectAreas[0],
  requiresGroupSplit: false,
  groupSplitThreshold: 25,
};

export default function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject, setSubjects } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<Omit<Subject, 'id'>>(emptySubject);

  const [anchorsOpen, setAnchorsOpen] = useState(false);
  const [anchorsSubject, setAnchorsSubject] = useState<Subject | null>(null);

  const filteredSubjects = subjects
    .filter(
      (subject) =>
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subject.area.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        area: subject.area,
        requiresGroupSplit: subject.requiresGroupSplit,
        groupSplitThreshold: subject.groupSplitThreshold,
      });
    } else {
      setEditingSubject(null);
      setFormData(emptySubject);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;

    if (editingSubject) {
      updateSubject(editingSubject.id, formData);
    } else {
      addSubject({ ...formData, id: generateId() });
    }
    setIsDialogOpen(false);
    setFormData(emptySubject);
    setEditingSubject(null);
  };

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      "Русский язык и литература": "bg-red-100 text-red-800",
      "Иностранные языки": "bg-blue-100 text-blue-800",
      "Математика и информатика": "bg-purple-100 text-purple-800",
      "Общественно-научные предметы": "bg-orange-100 text-orange-800",
      "Естественнонаучные предметы": "bg-green-100 text-green-800",
      "Искусство": "bg-pink-100 text-pink-800",
      "Технология": "bg-yellow-100 text-yellow-800",
      "Физическая культура и ОБЖ": "bg-cyan-100 text-cyan-800",
    };
    return colors[area] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Предметы</h1>
          <p className="text-muted-foreground">Учебные предметы и настройки деления на группы</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionImportExportActions<Subject>
            sectionLabel="Предметы"
            exportExcel={() => exportSubjectsToExcel(subjects)}
            exportJsonData={() => subjects}
            importFromTable={(table) =>
              parseSubjectsFromData(table).map((s) => ({ ...s, id: crypto.randomUUID() }))
            }
            importFromJson={(arr) =>
              (arr as any[]).map((s) => ({
                id: (s?.id as string) || crypto.randomUUID(),
                name: String(s?.name ?? "").trim(),
                area: String(s?.area ?? "Общие").trim(),
                requiresGroupSplit: Boolean(s?.requiresGroupSplit),
                groupSplitThreshold:
                  s?.groupSplitThreshold === undefined || s?.groupSplitThreshold === null || s?.groupSplitThreshold === ""
                    ? undefined
                    : Number(s.groupSplitThreshold),
              }))
            }
            onReplace={(items) => setSubjects(items)}
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить предмет
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? "Редактировать предмет" : "Новый предмет"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название предмета *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Русский язык"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Предметная область</Label>
                  <Select 
                    value={formData.area} 
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, area: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectAreas.map(area => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-4">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Деление на группы
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Для иностранного языка, информатики, технологии и т.д.
                  </p>
                </div>
                <Switch
                  checked={formData.requiresGroupSplit}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, requiresGroupSplit: checked }))
                  }
                />
              </div>

              {formData.requiresGroupSplit && (
                <div className="space-y-2">
                  <Label htmlFor="threshold">Порог для деления (кол-во учеников)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={formData.groupSplitThreshold || 25}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      groupSplitThreshold: parseInt(e.target.value) || 25 
                    }))}
                    min={10}
                    max={40}
                  />
                  <p className="text-xs text-muted-foreground">
                    Класс делится на группы, если учеников больше указанного числа
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim()}>
                {editingSubject ? "Сохранить" : "Добавить"}
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
            placeholder="Поиск по названию или области..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Всего: {subjects.length} предметов
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Предмет</TableHead>
              <TableHead>Предметная область</TableHead>
              <TableHead>Деление на группы</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {subjects.length === 0 
                    ? "Нет добавленных предметов. Нажмите «Добавить предмет» для начала."
                    : "Ничего не найдено"
                  }
                </TableCell>
              </TableRow>
            ) : (
              filteredSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={getAreaColor(subject.area)}>
                      {subject.area}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {subject.requiresGroupSplit ? (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Users className="h-3 w-3" />
                        от {subject.groupSplitThreshold}+ чел.
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAnchorsSubject(subject);
                          setAnchorsOpen(true);
                        }}
                        title="Закрепления"
                      >
                        <Anchor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(subject)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSubject(subject.id)}
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

      {anchorsSubject && (
        <AnchorsManagerDialog
          open={anchorsOpen}
          onOpenChange={(o) => {
            setAnchorsOpen(o);
            if (!o) setAnchorsSubject(null);
          }}
          targetType="subject"
          targetId={anchorsSubject.id}
          targetName={anchorsSubject.name}
        />
      )}
    </div>
  );
}
