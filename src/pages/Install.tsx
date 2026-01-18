import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandaloneMode() {
  // iOS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navAny = navigator as any;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || navAny.standalone === true;
}

export default function Install() {
  const { toast } = useToast();
  const { isInstallable, promptInstall } = usePwaInstallPrompt();

  const ios = isIOS();
  const standalone = isStandaloneMode();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Установка приложения</h1>
        <p className="text-muted-foreground">
          Можно установить как отдельное приложение на Windows, Android и iOS — без магазинов и без EXE.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Быстрая установка</CardTitle>
          <CardDescription>Если браузер поддерживает установку, кнопка будет активна.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            disabled={!isInstallable || standalone}
            onClick={async () => {
              const res = await promptInstall();
              if (res?.outcome === "accepted") {
                toast({ title: "Установка запущена", description: "Следуйте подсказкам браузера." });
              }
            }}
          >
            Установить приложение
          </Button>
          {standalone && (
            <p className="text-sm text-muted-foreground">Похоже, приложение уже открыто в установленном режиме.</p>
          )}
          {ios && (
            <p className="text-sm text-muted-foreground">
              На iPhone/iPad кнопка установки обычно не появляется — используйте инструкцию ниже.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Windows 11 (Edge/Chrome)</CardTitle>
            <CardDescription>Установится как отдельная программа (ярлык в Пуск).</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Откройте сайт приложения в Microsoft Edge или Google Chrome.</li>
              <li>Нажмите значок «Установить» в адресной строке или меню браузера.</li>
              <li>Подтвердите установку.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Android (Chrome)</CardTitle>
            <CardDescription>Будет на рабочем столе как обычное приложение.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Откройте сайт приложения в Chrome.</li>
              <li>Меню ⋮ → «Установить приложение» / «Добавить на главный экран».</li>
              <li>Подтвердите.</li>
            </ol>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>iPhone / iPad (Safari)</CardTitle>
            <CardDescription>Установка через меню «Поделиться».</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Откройте сайт приложения в Safari (не в встроенном браузере).</li>
              <li>Нажмите «Поделиться» (квадрат со стрелкой вверх).</li>
              <li>Выберите «На экран «Домой»» → «Добавить».</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
