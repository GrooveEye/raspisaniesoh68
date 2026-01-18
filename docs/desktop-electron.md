# Десктоп-приложение (Windows .exe/.msi) через Electron + GitHub Actions

## 0) Подключение GitHub
В Lovable: **GitHub → Connect to GitHub → Create Repository**. После этого изменения из Lovable будут автоматически синхронизироваться в репозиторий.

## 1) Что уже добавлено в проект
- `electron/main.cjs` — основное окно Electron
- `electron/preload.cjs` — preload (пока пустой)
- `electron-builder.yml` — конфиг сборки (NSIS + MSI)
- `.github/workflows/desktop-windows.yml` — автосборка в GitHub Actions

## 2) Локальная сборка на Windows (без GitHub Actions)
Требования: Node.js 20+, Git.

```bash
npm ci
npm run build
# (опционально для MSI) установить WiX: choco install wixtoolset -y
npx electron-builder --config electron-builder.yml --win
```
Готовые установщики появятся в папке `release/`.

## 3) Автосборка в GitHub Actions
Workflow настроен так:
- запускается вручную (**Actions → Build Desktop (Windows) → Run workflow**)
- или при пуше тега `v*` (например `v1.0.0`)

### Как выпустить версию через тег
```bash
git tag v1.0.0
git push origin v1.0.0
```
После выполнения workflow артефакты (`.exe`, `.msi`) будут доступны в **Actions → run → Artifacts**.

## 4) Офлайн-режим
Electron-приложение будет работать офлайн, если веб-сборка (Vite) не зависит от сети. У вас данные уже хранятся локально (localStorage), так что это подходит.

## 5) Примечания
- Если MSI будет падать на сборке: иногда WiX/права/окружение в раннере меняются; можно временно убрать `msi` из `electron-builder.yml` и собирать только NSIS (`.exe`).
- Для автообновлений можно позже добавить `electron-updater` + GitHub Releases.
