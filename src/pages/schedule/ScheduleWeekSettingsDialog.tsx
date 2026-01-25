import { useEffect, useMemo, useState } from "react";
import type { WeekGrid } from "@/types";
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

export function ScheduleWeekSettingsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: WeekGrid;
  onSave: (grid: WeekGrid) => void;
}) {
  const { open, onOpenChange, value, onSave } = props;
  const [daysCsv, setDaysCsv] = useState("");
  const [slotsPerDay, setSlotsPerDay] = useState("7");

  useEffect(() => {
    if (!open) return;
    setDaysCsv(value.days.join(", "));
    setSlotsPerDay(String(value.slotsPerDay));
  }, [open, value.days, value.slotsPerDay]);

  const parsedDays = useMemo(() => {
    return daysCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [daysCsv]);

  const handleSave = () => {
    const n = Number(slotsPerDay);
    if (parsedDays.length < 3) {
      toast({
        title: "Проверьте дни недели",
        description: "Нужно минимум 3 дня (через запятую).",
        variant: "destructive",
      });
      return;
    }
    if (!Number.isFinite(n) || n < 1 || n > 12) {
      toast({
        title: "Проверьте количество уроков",
        description: "Укажите число от 1 до 12.",
        variant: "destructive",
      });
      return;
    }
    onSave({ days: parsedDays, slotsPerDay: n });
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
          <div className="space-y-2">
            <Label htmlFor="days">Дни (через запятую)</Label>
            <Input
              id="days"
              value={daysCsv}
              onChange={(e) => setDaysCsv(e.target.value)}
              placeholder="Понедельник, Вторник, ..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slots">Уроков (слотов) в день</Label>
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
