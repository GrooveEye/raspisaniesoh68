import { useEffect, useMemo, useState } from "react";
import type { LoadAssignment, Subject, Teacher, SchoolClass } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

type EditorDefaults = Partial<Pick<LoadAssignment, "classId" | "subjectId" | "teacherId" | "hoursPerWeek" | "isGroup" | "groupNumber">>;

export function DistributionEditorDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  defaults?: EditorDefaults;
  teachers: Teacher[];
  subjects: Subject[];
  classes: SchoolClass[];
  getDefaultHours: (subjectId: string, classId: string) => number;
  onSubmit: (assignment: LoadAssignment) => void;
}) {
  const {
    open,
    onOpenChange,
    title = "Редактор назначения",
    description = "Укажите класс, предмет и учителя.",
    defaults,
    teachers,
    subjects,
    classes,
    getDefaultHours,
    onSubmit,
  } = props;

  const [subjectId, setSubjectId] = useState(defaults?.subjectId ?? "");
  const [classId, setClassId] = useState(defaults?.classId ?? "");
  const [teacherId, setTeacherId] = useState(defaults?.teacherId ?? "");
  const [hours, setHours] = useState<number>(() => defaults?.hoursPerWeek ?? 0);
  const [isGroup, setIsGroup] = useState<boolean>(() => defaults?.isGroup ?? false);
  const [groupNumber, setGroupNumber] = useState<number>(() => defaults?.groupNumber ?? 1);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter)),
    [classes]
  );

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId]
  );

  const availableTeachers = useMemo(() => {
    if (!selectedSubject) return teachers;
    return teachers.filter((t) => t.subjects.includes(selectedSubject.name));
  }, [teachers, selectedSubject]);

  const resetFromDefaults = () => {
    setSubjectId(defaults?.subjectId ?? "");
    setClassId(defaults?.classId ?? "");
    setTeacherId(defaults?.teacherId ?? "");
    setHours(defaults?.hoursPerWeek ?? 0);
    setIsGroup(defaults?.isGroup ?? false);
    setGroupNumber(defaults?.groupNumber ?? 1);
  };

  // ВАЖНО: стейты инициализируются один раз; при повторном открытии/смене defaults
  // нужно синхронизировать значения, иначе остаётся предыдущий предмет/класс.
  useEffect(() => {
    if (open) resetFromDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    defaults?.subjectId,
    defaults?.classId,
    defaults?.teacherId,
    defaults?.hoursPerWeek,
    defaults?.isGroup,
    defaults?.groupNumber,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetFromDefaults();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Предмет</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                setSubjectId(v);
                // Если уже выбран класс, подтянем часы из плана
                if (classId) setHours(getDefaultHours(v, classId));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                {useMemo(
                  () => [...subjects].sort((a, b) => a.name.localeCompare(b.name, "ru")),
                  [subjects]
                ).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Класс</Label>
            <Select
              value={classId}
              onValueChange={(v) => {
                setClassId(v);
                if (subjectId) setHours(getDefaultHours(subjectId, v));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите класс" />
              </SelectTrigger>
              <SelectContent>
                {sortedClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.grade}
                    {c.letter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Учитель</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите учителя" />
              </SelectTrigger>
              <SelectContent>
                {availableTeachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Часов в неделю</Label>
            <Input
              inputMode="numeric"
              value={String(hours)}
              onChange={(e) => {
                const next = Number(e.target.value.replace(/[^0-9.]/g, ""));
                setHours(Number.isFinite(next) ? next : 0);
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="grid">
              <div className="text-sm font-medium">Деление на группы</div>
              <div className="text-sm text-muted-foreground">
                Используйте для назначения группы 1/2.
              </div>
            </div>
            <Switch checked={isGroup} onCheckedChange={setIsGroup} />
          </div>

          {isGroup && (
            <div className="grid gap-2">
              <Label>Номер группы</Label>
              <Select
                value={String(groupNumber)}
                onValueChange={(v) => setGroupNumber(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Группа 1</SelectItem>
                  <SelectItem value="2">Группа 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={() => {
              if (!subjectId || !classId || !teacherId) {
                toast.error("Заполните класс, предмет и учителя");
                return;
              }
              if (!hours || hours <= 0) {
                toast.error("Укажите корректное число часов");
                return;
              }

              onSubmit({
                id: crypto.randomUUID(),
                subjectId,
                classId,
                teacherId,
                hoursPerWeek: hours,
                isGroup,
                groupNumber: isGroup ? groupNumber : undefined,
              });
              onOpenChange(false);
              toast.success("Назначение сохранено");
            }}
          >
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
