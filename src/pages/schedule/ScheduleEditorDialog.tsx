import { useEffect, useMemo, useState } from "react";
import type { LoadAssignment, Room, ScheduleLesson, SchoolClass, Subject, Teacher } from "@/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";

type EditorDefaults = {
  classId: string;
  day: string;
  slot: number;
  existing?: ScheduleLesson;
  issues?: string[];
};

export function ScheduleEditorDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: EditorDefaults | null;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  rooms: Room[];
  loadAssignments: LoadAssignment[];
  onSave: (lesson: ScheduleLesson) => void;
  onDelete?: (lessonId: string) => void;
}) {
  const {
    open,
    onOpenChange,
    defaults,
    classes,
    subjects,
    teachers,
    rooms,
    loadAssignments,
    onSave,
    onDelete,
  } = props;

  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupNumber, setGroupNumber] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !defaults) return;
    const ex = defaults.existing;
    setSubjectId(ex?.subjectId || "");
    setTeacherId(ex?.teacherId || "");
    setRoomId(ex?.roomId || "");
    setIsGroup(Boolean(ex?.isGroup));
    setGroupNumber(String(ex?.groupNumber || 1));
    setNotes(ex?.notes || "");
  }, [open, defaults]);

  const availableSubjectIds = useMemo(() => {
    if (!defaults?.classId) return [] as string[];
    const ids = new Set(
      loadAssignments.filter((a) => a.classId === defaults.classId).map((a) => a.subjectId)
    );
    return [...ids];
  }, [defaults?.classId, loadAssignments]);

  const availableTeachers = useMemo(() => {
    if (!defaults?.classId || !subjectId) return [] as Teacher[];
    const teacherIds = new Set(
      loadAssignments
        .filter((a) => a.classId === defaults.classId && a.subjectId === subjectId)
        .map((a) => a.teacherId)
    );
    return teachers.filter((t) => teacherIds.has(t.id));
  }, [defaults?.classId, loadAssignments, subjectId, teachers]);

  const className = useMemo(() => {
    const c = classes.find((x) => x.id === defaults?.classId);
    return c ? `${c.grade}${c.letter}` : "";
  }, [classes, defaults?.classId]);

  const subjectName = subjects.find((s) => s.id === subjectId)?.name;
  const teacherName = teachers.find((t) => t.id === teacherId)?.fullName;

  const handleSave = () => {
    if (!defaults) return;
    if (!subjectId) {
      toast({ title: "Выберите предмет", variant: "destructive" });
      return;
    }
    if (!teacherId) {
      toast({ title: "Выберите учителя", variant: "destructive" });
      return;
    }
    const id = defaults.existing?.id || (crypto?.randomUUID?.() ?? String(Date.now()));
    const next: ScheduleLesson = {
      id,
      classId: defaults.classId,
      day: defaults.day,
      slot: defaults.slot,
      subjectId,
      teacherId,
      roomId: roomId || undefined,
      isGroup: isGroup || undefined,
      groupNumber: isGroup ? Number(groupNumber) : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    };
    onSave(next);
    onOpenChange(false);
    toast({
      title: "Урок сохранён",
      description: `${className}: ${subjectName ?? ""}${teacherName ? ` — ${teacherName}` : ""}`,
    });
  };

  const handleDelete = () => {
    if (!defaults?.existing || !onDelete) return;
    onDelete(defaults.existing.id);
    onOpenChange(false);
    toast({ title: "Урок удалён" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Урок: {className} — {defaults?.day}, {defaults?.slot}-й
          </DialogTitle>
          <DialogDescription>
            Выбор предмета/учителя берётся из результатов распределения нагрузки.
          </DialogDescription>
        </DialogHeader>

        {defaults?.issues?.length ? (
          <div className="flex flex-wrap gap-2">
            {defaults.issues.map((t) => (
              <Badge key={t} variant="destructive">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Предмет</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                {subjects
                  .filter((s) => availableSubjectIds.includes(s.id))
                  .sort((a, b) => a.name.localeCompare(b.name, "ru"))
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Учитель</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder={subjectId ? "Выберите учителя" : "Сначала выберите предмет"} />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers
                  .slice()
                  .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"))
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.fullName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Кабинет (опционально)</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Не указан</SelectItem>
                {rooms
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "ru"))
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}{r.type ? ` — ${r.type}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="space-y-0.5">
              <div className="font-medium">Деление на группы</div>
              <div className="text-sm text-muted-foreground">Если это группа внутри класса</div>
            </div>
            <Switch checked={isGroup} onCheckedChange={setIsGroup} />
          </div>

          {isGroup ? (
            <div className="space-y-2">
              <Label>Номер группы</Label>
              <Input
                type="number"
                min={1}
                max={4}
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Примечание (опционально)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {defaults?.existing && onDelete ? (
            <Button variant="destructive" onClick={handleDelete}>
              Удалить
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
