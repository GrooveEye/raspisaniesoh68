import { useRef, useState } from "react";
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
import { parseExcelFile, parseJSONFile } from "@/lib/exportUtils";
import { saveAs } from "file-saver";
import { FileJson, FileSpreadsheet, Upload, AlertTriangle } from "lucide-react";
import { z } from "zod";

const jsonArraySchema = z.array(z.any());

export function SectionImportExportActions<T>(props: {
  sectionLabel: string;
  exportExcel: () => void;
  exportJsonData: () => unknown[];
  importFromTable: (data: any[][]) => T[];
  importFromJson: (data: unknown[]) => T[];
  onReplace: (items: T[]) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<T[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const exportJson = () => {
    const data = props.exportJsonData();
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      section: props.sectionLabel,
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    saveAs(blob, `${props.sectionLabel}-export-${new Date().toISOString().split("T")[0]}.json`);
  };

  const pickImport = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsParsing(true);
    try {
      const name = file.name.toLowerCase();
      let items: T[] = [];

      if (name.endsWith(".json")) {
        const raw = await parseJSONFile(file);
        const arr = raw?.data ?? raw; // поддержка 2 форматов: {data:[...]} и просто [...]
        const parsed = jsonArraySchema.safeParse(arr);
        if (!parsed.success) throw new Error("Некорректный JSON (ожидается массив записей)");
        items = props.importFromJson(parsed.data);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const table = await parseExcelFile(file);
        items = props.importFromTable(table);
      } else {
        throw new Error("Поддерживаются только Excel (.xlsx/.xls) и JSON (.json)");
      }

      if (!items || items.length === 0) {
        throw new Error("Файл не содержит данных или формат не распознан");
      }

      setPending(items);
      setConfirmOpen(true);
    } catch (err) {
      toast({
        title: "Ошибка импорта",
        description: err instanceof Error ? err.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const doReplace = () => {
    if (!pending) return;
    props.onReplace(pending);
    setConfirmOpen(false);
    setPending(null);
    toast({ title: "Импорт завершён", description: `Раздел «${props.sectionLabel}» заменён (${pending.length}).` });
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.json,application/json"
        className="hidden"
        onChange={onFileChange}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportJson}>
          <FileJson className="mr-2 h-4 w-4" />
          Экспорт в JSON
        </Button>
        <Button variant="outline" onClick={props.exportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Экспорт в Excel
        </Button>
        <Button variant="secondary" onClick={pickImport} disabled={isParsing}>
          <Upload className="mr-2 h-4 w-4" />
          Импорт
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Импортировать и заменить раздел?
            </DialogTitle>
            <DialogDescription>
              Раздел «{props.sectionLabel}» будет полностью заменён данными из файла.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTitle>Важно</AlertTitle>
            <AlertDescription>
              Остальные разделы (расписание, распределение, кабинеты и т.д.) не изменяются — только текущий.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={doReplace}>
              Заменить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
