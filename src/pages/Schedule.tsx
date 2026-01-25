import { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { Room, ScheduleLesson } from "@/types";
import { getScheduleIssues } from "@/pages/schedule/scheduleUtils";
import { ScheduleEditorDialog } from "@/pages/schedule/ScheduleEditorDialog";
import { ScheduleWeekSettingsDialog } from "@/pages/schedule/ScheduleWeekSettingsDialog";

function classLabel(grade: number, letter: string) {
  return `${grade}${letter}`;
}

export default function Schedule() {
  const {
    classes,
    subjects,
    teachers,
    loadAssignments,
    rooms,
    weekGrid,
    teacherAvailability,
    scheduleLessons,
    setWeekGrid,
    upsertScheduleLesson,
    deleteScheduleLesson,
    addRoom,
    updateRoom,
    deleteRoom,
    setTeacherAvailabilityCell,
  } = useApp();

  const sortedClasses = useMemo(() => {
    return classes
      .slice()
      .sort((a, b) => (a.grade !== b.grade ? a.grade - b.grade : a.letter.localeCompare(b.letter, "ru")));
  }, [classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(sortedClasses[0]?.id || "");
  const [editorOpen, setEditorOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [editorDefaults, setEditorDefaults] = useState<{
    classId: string;
    day: string;
    slot: number;
    existing?: ScheduleLesson;
    issues?: string[];
  } | null>(null);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const { byLessonId, selectedClassIssues } = useMemo(() => {
    return getScheduleIssues({ lessons: scheduleLessons, availability: teacherAvailability, selectedClassId });
  }, [scheduleLessons, teacherAvailability, selectedClassId]);

  const issuesByLessonId = byLessonId;

  const lessonsByCell = useMemo(() => {
    const m = new Map<string, ScheduleLesson[]>();
    for (const l of scheduleLessons) {
      if (l.classId !== selectedClassId) continue;
      const key = `${l.day}__${l.slot}`;
      m.set(key, [...(m.get(key) || []), l]);
    }
    return m;
  }, [scheduleLessons, selectedClassId]);

  const openEditor = (day: string, slot: number) => {
    const key = `${day}__${slot}`;
    const existing = (lessonsByCell.get(key) || [])[0];
    const issues = existing ? (issuesByLessonId.get(existing.id) || []).map((i) => i.message) : [];
    setEditorDefaults({ classId: selectedClassId, day, slot, existing, issues });
    setEditorOpen(true);
  };

  // ===== Rooms tab =====
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState("");
  const [availabilityTeacherId, setAvailabilityTeacherId] = useState<string>(teachers[0]?.id || "");

  const upsertRoomQuick = () => {
    const name = newRoomName.trim();
    if (!name) return;
    const room: Room = {
      id: crypto?.randomUUID?.() ?? String(Date.now()),
      name,
      type: newRoomType.trim() || undefined,
    };
    addRoom(room);
    setNewRoomName("");
    setNewRoomType("");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Расписание</h1>
          <p className="text-muted-foreground mt-1">Составление расписания по классам на основе распределения нагрузки</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-[240px]">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
          <Button variant="secondary" onClick={() => setWeekOpen(true)}>
            Сетка недели
          </Button>
        </div>
      </header>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">Расписание</TabsTrigger>
          <TabsTrigger value="rooms">Кабинеты</TabsTrigger>
          <TabsTrigger value="availability">Доступность</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          {!selectedClass ? (
            <Card>
              <CardHeader>
                <CardTitle>Нет классов</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">Сначала создайте классы в справочнике.</CardContent>
            </Card>
          ) : (
            <>
              {selectedClassIssues.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Конфликты в выбранном классе</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Найдено: {selectedClassIssues.length}. Откройте проблемные слоты — в редакторе будут подсказки.
                  </CardContent>
                </Card>
              ) : null}

              <div className="rounded-lg border bg-card overflow-auto">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `minmax(80px, 120px) repeat(${weekGrid.days.length}, minmax(180px, 1fr))`,
                  }}
                >
                  <div className="sticky top-0 bg-card border-b p-3 font-medium">Урок</div>
                  {weekGrid.days.map((d) => (
                    <div key={d} className="sticky top-0 bg-card border-b p-3 font-medium">
                      {d}
                    </div>
                  ))}

                  {Array.from({ length: weekGrid.slotsPerDay }).map((_, i) => {
                    const slot = i + 1;
                    return (
                      <div key={`row-${slot}`} className="contents">
                        <div key={`slot-${slot}`} className="border-b p-3 text-sm text-muted-foreground">
                          {slot}-й
                        </div>
                        {weekGrid.days.map((day) => {
                          const cellKey = `${day}__${slot}`;
                          const lesson = (lessonsByCell.get(cellKey) || [])[0];
                          const hasIssues = lesson ? (issuesByLessonId.get(lesson.id) || []).length > 0 : false;
                          const subject = lesson ? subjects.find((s) => s.id === lesson.subjectId) : null;
                          const teacher = lesson ? teachers.find((t) => t.id === lesson.teacherId) : null;
                          const room = lesson?.roomId ? rooms.find((r) => r.id === lesson.roomId) : null;

                          return (
                            <button
                              key={cellKey}
                              type="button"
                              onClick={() => openEditor(day, slot)}
                              className={
                                "border-b p-3 text-left hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring" +
                                (hasIssues ? " ring-1 ring-destructive" : "")
                              }
                            >
                              {lesson ? (
                                <div className="space-y-1">
                                  <div className="font-medium leading-snug">{subject?.name || "—"}</div>
                                  <div className="text-sm text-muted-foreground leading-snug">{teacher?.fullName || "—"}</div>
                                  {room ? (
                                    <div className="text-xs text-muted-foreground">{room.name}</div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">Добавить…</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Кабинеты / ресурсы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="101" />
                </div>
                <div className="space-y-2">
                  <Label>Тип (опционально)</Label>
                  <Input value={newRoomType} onChange={(e) => setNewRoomType(e.target.value)} placeholder="спортзал" />
                </div>
                <div className="flex items-end">
                  <Button onClick={upsertRoomQuick} disabled={!newRoomName.trim()}>
                    Добавить
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {rooms.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Пока нет кабинетов.</div>
                ) : (
                  <div className="space-y-2">
                    {rooms
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name, "ru"))
                      .map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-md border p-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{r.name}</div>
                            {r.type ? <div className="text-sm text-muted-foreground truncate">{r.type}</div> : null}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                const name = prompt("Название кабинета", r.name);
                                if (name === null) return;
                                const type = prompt("Тип (опционально)", r.type || "");
                                updateRoom(r.id, {
                                  name: name.trim() || r.name,
                                  type: type?.trim() || undefined,
                                });
                              }}
                            >
                              Изменить
                            </Button>
                            <Button variant="destructive" onClick={() => deleteRoom(r.id)}>
                              Удалить
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Доступность учителей</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-[280px]">
                  <Select value={availabilityTeacherId} onValueChange={setAvailabilityTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите учителя" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers
                        .slice()
                        .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"))
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.fullName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Выключите слоты, где учитель не может вести урок (совместители, окна занятости и т.п.).
                </div>
              </div>

              {!availabilityTeacherId ? (
                <div className="text-sm text-muted-foreground">Добавьте учителей и выберите одного.</div>
              ) : (
                <div className="rounded-lg border overflow-auto">
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `minmax(80px, 120px) repeat(${weekGrid.days.length}, minmax(140px, 1fr))`,
                    }}
                  >
                    <div className="sticky top-0 bg-card border-b p-3 font-medium">Урок</div>
                    {weekGrid.days.map((d) => (
                      <div key={d} className="sticky top-0 bg-card border-b p-3 font-medium">
                        {d}
                      </div>
                    ))}

                    {Array.from({ length: weekGrid.slotsPerDay }).map((_, i) => {
                      const slot = i + 1;
                      return (
                        <div key={`av-row-${slot}`} className="contents">
                          <div key={`slot-av-${slot}`} className="border-b p-3 text-sm text-muted-foreground">
                            {slot}-й
                          </div>
                          {weekGrid.days.map((day) => {
                            const available =
                              teacherAvailability[availabilityTeacherId]?.[day]?.[slot] ?? true;
                            return (
                              <div key={`${day}-${slot}`} className="border-b p-3">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={available}
                                    onCheckedChange={(v) =>
                                      setTeacherAvailabilityCell(availabilityTeacherId, day, slot, v)
                                    }
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {available ? "Можно" : "Нельзя"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScheduleEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        defaults={editorDefaults}
        classes={classes}
        subjects={subjects}
        teachers={teachers}
        rooms={rooms}
        loadAssignments={loadAssignments}
        onSave={upsertScheduleLesson}
        onDelete={deleteScheduleLesson}
      />

      <ScheduleWeekSettingsDialog
        open={weekOpen}
        onOpenChange={setWeekOpen}
        value={weekGrid}
        onSave={(grid) => setWeekGrid(grid)}
      />
    </div>
  );
}
