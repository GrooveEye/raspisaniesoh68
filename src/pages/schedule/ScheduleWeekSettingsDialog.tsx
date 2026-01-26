import { useEffect, useState } from "react";
import type { WeekGrid, WeekType } from "@/types";
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
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function ScheduleWeekSettingsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: WeekGrid;
  onSave: (grid: WeekGrid) => void;
}) {
  const { open, onOpenChange, value, onSave } = props;
  const [weekType, setWeekType] = useState<WeekType>(5);
  const [includeZeroLesson, setIncludeZeroLesson] = useState(false);
  const [minusOneDays, setMinusOneDays] = useState<Record<string, boolean>>({});
  const [slotsPerDay, setSlotsPerDay] = useState("7");

  const days = useState(() => {
    const base = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];
    return base;
  })[0];

  const daysForWeekType = (wt: WeekType) => (wt === 6 ? [...days, "Суббота"] : days);

  useEffect(() => {
    if (!open) return;
    setWeekType(value.weekType);
    setIncludeZeroLesson(value.includeZeroLesson);
    setSlotsPerDay(String(value.slotsPerDay));
    setMinusOneDays(value.includeMinusOneLessonDays ?? {});
  }, [open, value.weekType, value.includeZeroLesson, value.slotsPerDay, value.includeMinusOneLessonDays]);

  const handleSave = () => {
    const n = Number(slotsPerDay);
    if (!Number.isFinite(n) || n < 1 || n > 12) {
      toast({
        title: "Проверьте количество уроков",
        description: "Укажите число от 1 до 12.",
        variant: "destructive",
      });
      return;
    }
    onSave({
      weekType,
      includeZeroLesson,
      includeMinusOneLessonDays: minusOneDays,
      slotsPerDay: n,
    });
    onOpenChange(false);
    toast({ title: "Сетка недели обновлена" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сетка недели</DialogTitle>
          <DialogDescription>
            Настройте дни недели и количество уроков (слотов) в день.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Учебная неделя</Label>
              <Select value={String(weekType)} onValueChange={(v) => setWeekType(Number(v) as WeekType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5-дневка</SelectItem>
                  <SelectItem value="6">6-дневка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>0-й урок</Label>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="text-sm text-muted-foreground">Показывать слот 0</div>
                <Switch checked={includeZeroLesson} onCheckedChange={setIncludeZeroLesson} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>-1 урок (только в выбранные дни)</Label>
            <div className="rounded-md border p-3 space-y-3">
              <div className="text-sm text-muted-foreground">
                «-1 урок» будет доступен для закреплений предметов/внеурочки только в отмеченные дни.
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {daysForWeekType(weekType).map((d) => (
                  <div key={d} className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm">{d}</div>
                    <Switch
                      checked={Boolean(minusOneDays[d])}
                      onCheckedChange={(on) =>
                        setMinusOneDays((prev) => ({
                          ...prev,
                          [d]: on,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slots">Уроков в день</Label>
            <Input
              id="slots"
              type="number"
              min={1}
              max={12}
              value={slotsPerDay}
              onChange={(e) => setSlotsPerDay(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
