import { useMemo, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { exportAllToExcel, exportToJSON, parseJSONFile } from "@/lib/exportUtils";
import type { AppState } from "@/types";
import { Download, FileJson, FileSpreadsheet, Upload, AlertTriangle } from "lucide-react";
import { z } from "zod";

const appStateSchema = z
  .object({
    schemaVersion: z.number().optional(),
    exportedAt: z.string().optional(),

    teachers: z.array(z.any()).optional(),
    classes: z.array(z.any()).optional(),
    subjects: z.array(z.any()).optional(),
    rooms: z.array(z.any()).optional(),
    extracurriculars: z.array(z.any()).optional(),
    loadAssignments: z.array(z.any()).optional(),
    extracurricularAssignments: z.array(z.any()).optional(),
    curriculumPlan: z.record(z.any()).optional(),

    weekGrid: z.any().optional(),
    teacherAvailability: z.any().optional(),
    scheduleLessons: z.array(z.any()).optional(),
    scheduleAnchors: z.array(z.any()).optional(),
  })
  .passthrough();

export function QuickBackupActions(props: { className?: string }) {
  const { className } = props;
  const { toast } = useToast();

  const {
    teachers,
    classes,
    subjects,
    rooms,
    extracurriculars,
    loadAssignments,
    extracurricularAssignments,
    curriculumPlan,
    weekGrid,
    teacherAvailability,
    scheduleLessons,
    scheduleAnchors,
    restoreAllData,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingData, setPendingData] = useState<Partial<AppState> | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const snapshot = useMemo(
    () => ({
      teachers,
      classes,
      subjects,
      rooms,
      extracurriculars,
      loadAssignments,
      extracurricularAssignments,
      curriculumPlan,
      weekGrid,
      teacherAvailability,
      scheduleLessons,
      scheduleAnchors,
    }),
    [
      teachers,
      classes,
      subjects,
      rooms,
      extracurriculars,
      loadAssignments,
      extracurricularAssignments,
      curriculumPlan,
      weekGrid,
      teacherAvailability,
      scheduleLessons,
      scheduleAnchors,
    ]
  );

  const handleExportJson = () => {
    exportToJSON(snapshot);
  };

  const handleExportExcel = () => {
    exportAllToExcel(
      teachers,
      classes,
      subjects,
      rooms,
      extracurriculars,
      loadAssignments,
      extracurricularAssignments,
      curriculumPlan,
      weekGrid,
      teacherAvailability,
      scheduleLessons,
      scheduleAnchors
    );
  };

  const handlePickJson = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".json")) {
      toast({
        title: "Неподдерживаемый формат",
        description: "Для восстановления нужен JSON-файл (полный экспорт).",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);
    try {
      const raw = await parseJSONFile(file);
      const parsed = appStateSchema.safeParse(raw);
      if (!parsed.success) {
        toast({
          title: "Некорректный файл",
          description: "JSON не похож на экспорт из приложения.",
          variant: "destructive",
        });
        return;
      }

      setPendingData(parsed.data as Partial<AppState>);
      setConfirmOpen(true);
    } catch (err) {
      toast({
        title: "Ошибка чтения файла",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const doRestore = () => {
    if (!pendingData) return;
    restoreAllData(pendingData);
    setConfirmOpen(false);
    setPendingData(null);
    toast({ title: "Восстановлено", description: "Данные приложения заменены данными из файла." });
  };

  return (
    <div className={className ?? ""}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleExportJson}>
          <FileJson className="mr-2 h-4 w-4" />
          Экспорт JSON
        </Button>
        <Button variant="outline" onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Экспорт Excel
        </Button>
        <Button variant="secondary" onClick={handlePickJson} disabled={isParsing}>
          <Upload className="mr-2 h-4 w-4" />
          Импорт JSON (restore)
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Восстановить данные из JSON?
            </DialogTitle>
            <DialogDescription>
              Это действие заменит всё текущее состояние приложения данными из файла.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Download className="h-4 w-4" />
            <AlertTitle>Рекомендация</AlertTitle>
            <AlertDescription>
              Перед восстановлением сделайте экспорт текущего состояния (JSON), чтобы можно было вернуться назад.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={doRestore}>
              Восстановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
