import { useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import type { Room } from "@/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

const emptyRoom: Omit<Room, "id"> = {
  name: "",
  floor: undefined,
  isUniversal: false,
  subjectIds: [],
};

export default function Rooms() {
  const { rooms, subjects, addRoom, updateRoom, deleteRoom } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<Omit<Room, "id">>(emptyRoom);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms
      .filter((r) =>
        q
          ? r.name.toLowerCase().includes(q) || String(r.floor ?? "").includes(q)
          : true
      )
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [rooms, searchQuery]);

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        floor: room.floor,
        isUniversal: room.isUniversal,
        subjectIds: room.subjectIds ?? [],
      });
    } else {
      setEditingRoom(null);
      setFormData(emptyRoom);
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) return;
    const payload = { ...formData, name: formData.name.trim() };
    if (editingRoom) {
      updateRoom(editingRoom.id, payload);
    } else {
      addRoom({ ...payload, id: generateId() });
    }
    setIsDialogOpen(false);
    setEditingRoom(null);
    setFormData(emptyRoom);
  };

  const subjectNameById = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s.name] as const));
  }, [subjects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Кабинеты</h1>
          <p className="text-muted-foreground">Справочник кабинетов: номер/название, предметы, этаж</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить кабинет
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRoom ? "Редактировать кабинет" : "Новый кабинет"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">№ / название *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="101 / спортзал"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Этаж</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={formData.floor ?? ""}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        floor: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    min={0}
                    max={10}
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium">Универсальный</div>
                  <div className="text-sm text-muted-foreground">Подходит для разных предметов</div>
                </div>
                <Checkbox
                  checked={formData.isUniversal}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, isUniversal: v === true }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Предметы кабинета</Label>
                <p className="text-xs text-muted-foreground">
                  Если кабинет универсальный — список можно не заполнять.
                </p>
                {subjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Сначала добавьте предметы.</div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {subjects
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
                      .map((s) => {
                        const checked = formData.subjectIds.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const on = v === true;
                                setFormData((p) => ({
                                  ...p,
                                  subjectIds: on
                                    ? Array.from(new Set([...p.subjectIds, s.id]))
                                    : p.subjectIds.filter((id) => id !== s.id),
                                }));
                              }}
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleSave} disabled={!formData.name.trim()}>
                {editingRoom ? "Сохранить" : "Добавить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру/названию или этажу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">Всего: {rooms.length}</p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Кабинет</TableHead>
              <TableHead>Этаж</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Предметы</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {rooms.length === 0 ? "Нет кабинетов. Нажмите «Добавить кабинет»." : "Ничего не найдено"}
                </TableCell>
              </TableRow>
            ) : (
              filteredRooms.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.floor ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {r.isUniversal ? (
                      <Badge variant="secondary">Универсальный</Badge>
                    ) : (
                      <Badge variant="outline">Предметный</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.isUniversal ? (
                      <span className="text-muted-foreground">—</span>
                    ) : r.subjectIds.length === 0 ? (
                      <span className="text-muted-foreground">Не указаны</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.subjectIds
                          .map((id) => subjectNameById.get(id) || "?")
                          .slice(0, 4)
                          .map((name) => (
                            <Badge key={name} variant="secondary">
                              {name}
                            </Badge>
                          ))}
                        {r.subjectIds.length > 4 ? (
                          <span className="text-xs text-muted-foreground">+{r.subjectIds.length - 4}</span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRoom(r.id)}>
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
