import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useApp } from "@/context/AppContext";
import type { ScheduleAnchor } from "@/types";

const generateId = () => Math.random().toString(36).substr(2, 9);

type TargetType = "subject" | "extracurricular";

function classLabel(grade: number, letter: string) {
  return `${grade}${letter}`;
}

export function AnchorsManagerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: TargetType;
  targetId: string;
  targetName: string;
}) {
  const { open, onOpenChange, targetType, targetId, targetName } = props;

  const {
    classes,
    weekGrid,
    scheduleAnchors,
    upsertScheduleAnchor,
    deleteScheduleAnchor,
    deleteScheduleAnchorFor,
    deleteExtracurricularAnchorFor,
  } = useApp();

  const days = useMemo(() => {
    const base = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
    return weekGrid.weekType === 6 ? [...base, "Суббота"] : base;
  }, [weekGrid.weekType]);

  const slots = useMemo(() => {
    const start = weekGrid.includeZeroLesson ? 0 : 1;
    const end = weekGrid.slotsPerDay;
    const arr: number[] = [];
    for (let s = start; s <= end; s++) arr.push(s);
    return arr;
  }, [weekGrid.includeZeroLesson, weekGrid.slotsPerDay]);

  const sortedClasses = useMemo(() => {
    return classes
      .slice()
      .sort((a, b) => (a.grade !== b.grade ? a.grade - b.grade : a.letter.localeCompare(b.letter, "ru")));
  }, [classes]);

  const anchorsForTarget = useMemo(() => {
    return scheduleAnchors
      .filter((a) =>
        targetType === "subject" ? a.subjectId === targetId : a.extracurricularId === targetId
      )
      .slice()
      .sort((a, b) => {
        const ca = classes.find((c) => c.id === a.classId);
        const cb = classes.find((c) => c.id === b.classId);
        const cla = ca ? classLabel(ca.grade, ca.letter) : "";
        const clb = cb ? classLabel(cb.grade, cb.letter) : "";
        if (cla !== clb) return cla.localeCompare(clb, "ru");
        if (a.day !== b.day) return a.day.localeCompare(b.day, "ru");
        return a.slot - b.slot;
      });
  }, [scheduleAnchors, targetType, targetId, classes]);

  const [classId, setClassId] = useState<string>(sortedClasses[0]?.id || "");
  const [day, setDay] = useState<string>(days[0] || "");
  const [slot, setSlot] = useState<number>(slots[0] ?? 1);

  const addAnchor = () => {
    if (!classId || !day) return;

    // Один класс+предмет(или внеурочка) — один якорь
    if (targetType === "subject") {
      deleteScheduleAnchorFor(classId, targetId);
    } else {
      deleteExtracurricularAnchorFor(classId, targetId);
    }

    const anchor: ScheduleAnchor = {
      id: generateId(),
      classId,
      day,
      slot,
      ...(targetType === "subject" ? { subjectId: targetId } : { extracurricularId: targetId }),
    };

    upsertScheduleAnchor(anchor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Закрепления: {targetName}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Класс</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите класс" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {classLabel(c.grade, c.letter)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>День</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите день" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Урок</Label>
                <Select value={String(slot)} onValueChange={(v) => setSlot(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Урок" />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s === 0 ? "0-й" : `${s}-й`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button onClick={addAnchor} disabled={!classId || !day}>
                Добавить / заменить закрепление
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {anchorsForTarget.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Для этого элемента пока нет закреплений.
              </div>
            ) : (
              anchorsForTarget.map((a) => {
                const c = classes.find((x) => x.id === a.classId);
                const label = c ? classLabel(c.grade, c.letter) : "?";
                return (
                  <div key={a.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{label}</div>
                      <div className="text-sm text-muted-foreground">
                        {a.day}, {a.slot === 0 ? "0-й" : `${a.slot}-й`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        value={a.day}
                        onValueChange={(nextDay) => upsertScheduleAnchor({ ...a, day: nextDay })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {days.map((d) => (
                            <SelectItem key={d} value={d}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={String(a.slot)}
                        onValueChange={(v) => upsertScheduleAnchor({ ...a, slot: Number(v) })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {slots.map((s) => (
                            <SelectItem key={s} value={String(s)}>
                              {s === 0 ? "0-й" : `${s}-й`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant="destructive" onClick={() => deleteScheduleAnchor(a.id)}>
                        Удалить
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
