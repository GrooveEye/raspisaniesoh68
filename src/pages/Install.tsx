import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { usePwaInstallPrompt } from "@/hooks/usePwaInstallPrompt";
import { Copy, Link as LinkIcon } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";


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

  const installUrl = typeof window !== "undefined" ? `${window.location.origin}/install` : "/install";

  const { qrBg, qrFg } = useMemo(() => {
    if (typeof window === "undefined") return { qrBg: "#ffffff", qrFg: "#0b0b0c" };

    const root = document.documentElement;
    const styles = getComputedStyle(root);

    const bg = styles.getPropertyValue("--background").trim();
    const fg = styles.getPropertyValue("--foreground").trim();

    // Our theme tokens are stored as: "H S% L%" (without the hsl() wrapper)
    const toHsl = (v: string, fallback: string) => (v ? `hsl(${v})` : fallback);

    return {
      qrBg: toHsl(bg, "#ffffff"),
      qrFg: toHsl(fg, "#0b0b0c"),
    };
  }, []);

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
          <CardTitle>Ссылка для установки</CardTitle>
          <CardDescription>Откройте на телефоне по QR-коду или скопируйте ссылку.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="space-y-2">
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={installUrl} readOnly className="pl-9" aria-label="Ссылка для установки" />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(installUrl);
                  toast({ title: "Ссылка скопирована", description: "Теперь можно отправить в мессенджер или открыть на телефоне." });
                } catch {
                  toast({
                    title: "Не удалось скопировать автоматически",
                    description: "Выделите ссылку и скопируйте вручную (Ctrl+C / ⌘C).",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Copy className="h-4 w-4" />
              Скопировать
            </Button>
          </div>

          <div className="flex justify-center sm:justify-end">
            <div className="rounded-lg border bg-background p-3">
              <QRCodeCanvas
                value={installUrl}
                size={160}
                includeMargin
                bgColor={qrBg}
                fgColor={qrFg}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
