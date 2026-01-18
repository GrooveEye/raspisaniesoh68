import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/context/AppContext";
import { Settings as SettingsIcon, School, Clock, Database, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const { clearAllData } = useApp();
  const [schoolName, setSchoolName] = useState(() => 
    localStorage.getItem('schoolName') || 'МБОУ СОШ №1'
  );
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(() => 
    localStorage.getItem('maxHoursPerWeek') || '36'
  );
  const [darkMode, setDarkMode] = useState(() => 
    localStorage.getItem('darkMode') === 'true'
  );

  const handleSaveSchoolName = () => {
    localStorage.setItem('schoolName', schoolName);
    toast({ title: "Сохранено", description: "Название школы обновлено" });
  };

  const handleSaveMaxHours = () => {
    localStorage.setItem('maxHoursPerWeek', maxHoursPerWeek);
    toast({ title: "Сохранено", description: "Максимум часов обновлён" });
  };

  const handleDarkModeChange = (checked: boolean) => {
    setDarkMode(checked);
    localStorage.setItem('darkMode', String(checked));
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleClearAllData = () => {
    clearAllData();
    toast({ 
      title: "Данные очищены", 
      description: "Все данные приложения были удалены",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
          <p className="text-muted-foreground">
            Настройки приложения и школы
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* School Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Школа
            </CardTitle>
            <CardDescription>
              Основные настройки образовательного учреждения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">Название школы</Label>
              <div className="flex gap-2">
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="МБОУ СОШ №1"
                />
                <Button onClick={handleSaveSchoolName}>Сохранить</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Load Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Нагрузка
            </CardTitle>
            <CardDescription>
              Параметры расчёта педагогической нагрузки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxHours">Максимум часов в неделю на ставку</Label>
              <div className="flex gap-2">
                <Input
                  id="maxHours"
                  type="number"
                  value={maxHoursPerWeek}
                  onChange={(e) => setMaxHoursPerWeek(e.target.value)}
                  min="1"
                  max="50"
                />
                <Button onClick={handleSaveMaxHours}>Сохранить</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Стандартная ставка — 18 часов, максимум — 36 часов
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Внешний вид</CardTitle>
            <CardDescription>
              Настройки отображения интерфейса
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Тёмная тема</Label>
                <p className="text-xs text-muted-foreground">
                  Использовать тёмный режим интерфейса
                </p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={handleDarkModeChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Database className="h-5 w-5" />
              Управление данными
            </CardTitle>
            <CardDescription>
              Очистка и сброс данных приложения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Очистить все данные
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие удалит все данные: учителей, классы, предметы, 
                    внеурочную деятельность, учебный план и распределение. 
                    Данные невозможно будет восстановить.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearAllData}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Удалить всё
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="mt-2 text-xs text-muted-foreground text-center">
              Рекомендуется сначала экспортировать данные
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
