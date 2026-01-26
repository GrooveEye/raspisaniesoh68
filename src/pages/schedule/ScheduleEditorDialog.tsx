import { useEffect, useMemo, useState } from "react";
import type {
  LoadAssignment,
  ScheduleAnchor,
  ScheduleLesson,
  SchoolClass,
  Subject,
  Teacher,
} from "@/types";

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
  loadAssignments: LoadAssignment[];
  anchors: ScheduleAnchor[];
  upsertAnchor: (anchor: ScheduleAnchor) => void;
  deleteAnchorFor: (classId: string, subjectId: string) => void;
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
    loadAssignments,
    anchors,
    upsertAnchor,
    deleteAnchorFor,
    onSave,
    onDelete,
  } = props;

  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [room, setRoom] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupNumber, setGroupNumber] = useState("1");
  const [notes, setNotes] = useState("");
  const [pinToSlot, setPinToSlot] = useState(false);

  useEffect(() => {
    if (!open || !defaults) return;
    const ex = defaults.existing;
    setSubjectId(ex?.subjectId || "");
    setTeacherId(ex?.teacherId || "");
    setRoom(ex?.room || "");
    setIsGroup(Boolean(ex?.isGroup));
    setGroupNumber(String(ex?.groupNumber || 1));
    setNotes(ex?.notes || "");
    setPinToSlot(false);
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

  const selectedTeacher = teachers.find((t) => t.id === teacherId);
  const teacherRoomLocked = Boolean(selectedTeacher?.primaryRoom && !selectedTeacher?.isUniversalRoom);

  // If teacher has fixed room, auto-fill.
  useEffect(() => {
    if (!open) return;
    if (teacherRoomLocked) {
      setRoom(selectedTeacher?.primaryRoom || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, teacherRoomLocked, open]);

  const anchorForSubject = useMemo(() => {
    if (!defaults?.classId || !subjectId) return null;
    return anchors.find((a) => a.classId === defaults.classId && a.subjectId === subjectId) || null;
  }, [anchors, defaults?.classId, subjectId]);

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
      room: room.trim() || undefined,
      isGroup: isGroup || undefined,
      groupNumber: isGroup ? Number(groupNumber) : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
    };

    if (pinToSlot) {
      const anchorId = anchorForSubject?.id || (crypto?.randomUUID?.() ?? String(Date.now()));
      upsertAnchor({
        id: anchorId,
        classId: defaults.classId,
        subjectId,
        day: defaults.day,
        slot: defaults.slot,
      });
    }

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

  const slotLabel = (slot?: number) => {
    if (slot === -1) return "-1";
    if (slot === 0) return "0-й";
    if (typeof slot === "number") return `${slot}-й`;
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Урок: {className} — {defaults?.day}, {slotLabel(defaults?.slot)}
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
            <Label>Кабинет/ресурс</Label>
            <Input
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder={teacherRoomLocked ? "Закреплён за учителем" : "Напр. 101 / спортзал"}
              disabled={teacherRoomLocked}
            />
            {teacherRoomLocked ? (
              <div className="text-xs text-muted-foreground">
                Кабинет берётся из профиля учителя (не универсальный).
              </div>
            ) : null}
          </div>

          {subjectId ? (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Закрепление предмета</div>
                  <div className="text-sm text-muted-foreground">
                    {anchorForSubject
                      ? `Сейчас закреплено: ${anchorForSubject.day}, ${slotLabel(anchorForSubject.slot)}`
                      : "Не закреплён"}
                  </div>
                </div>
                <Switch checked={pinToSlot} onCheckedChange={setPinToSlot} />
              </div>
              {anchorForSubject ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!defaults) return;
                    deleteAnchorFor(defaults.classId, subjectId);
                    toast({ title: "Закрепление удалено" });
                  }}
                >
                  Удалить закрепление
                </Button>
              ) : null}
            </div>
          ) : null}

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
