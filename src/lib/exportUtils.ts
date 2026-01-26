import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import type {
  Teacher,
  SchoolClass,
  Subject,
  Room,
  Extracurricular,
  LoadAssignment,
  ExtracurricularAssignment,
  CurriculumPlan,
  WeekGrid,
  TeacherAvailability,
  ScheduleLesson,
  ScheduleAnchor,
} from '@/types';

const EXTR_PREFIX = "extr_";

export type CurriculumPlanRow = {
  subjectName: string;
  className: string; // например: 9А
  hoursPerWeek: number;
};

// === JSON Export/Import ===

export function exportToJSON(data: {
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  rooms: Room[];
  extracurriculars: Extracurricular[];
  loadAssignments: LoadAssignment[];
  extracurricularAssignments: ExtracurricularAssignment[];
  curriculumPlan: CurriculumPlan;
  weekGrid: WeekGrid;
  teacherAvailability: TeacherAvailability;
  scheduleLessons: ScheduleLesson[];
  scheduleAnchors: ScheduleAnchor[];
}) {
  const payload = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  saveAs(blob, `school-plan-export-${new Date().toISOString().split('T')[0]}.json`);
}

export function parseJSONFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (error) {
        reject(new Error('Некорректный JSON файл'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

// === Excel Export ===

export function exportTeachersToExcel(teachers: Teacher[]) {
  const data = teachers.map(t => ({
    'ФИО': t.fullName,
    'Должность': t.position,
    'Категория': t.qualification,
    'Предметы': t.subjects.join(', '),
    'Мин. часов': t.minHours,
    'Макс. часов': t.maxHours,
    'Статус': t.status,
    'Основной кабинет': t.primaryRoom || '',
    'Универсальный кабинет': t.isUniversalRoom ? 'Да' : 'Нет',
    'Предпочт. параллели': (t.preferredGrades ?? []).join(', '),
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Учителя');
  
  // Auto-fit columns
  const colWidths = [
    { wch: 35 }, // ФИО
    { wch: 20 }, // Должность
    { wch: 15 }, // Категория
    { wch: 40 }, // Предметы
    { wch: 12 }, // Мин. часов
    { wch: 12 }, // Макс. часов
    { wch: 25 }, // Статус
    { wch: 18 }, // Основной кабинет
    { wch: 22 }, // Универсальный кабинет
    { wch: 22 }, // Предпочт. параллели
  ];
  ws['!cols'] = colWidths;
  
  XLSX.writeFile(wb, `teachers-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportClassesToExcel(classes: SchoolClass[], teachers: Teacher[]) {
  const data = classes.map(c => {
    const classTeacher = teachers.find(t => t.id === c.classTeacherId);
    return {
      'Класс': `${c.grade}${c.letter}`,
      'Параллель': c.grade,
      'Буква': c.letter,
      'Количество учеников': c.studentCount,
      'Профиль': c.profile,
      'Классный руководитель': classTeacher?.fullName || ''
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Классы');
  
  ws['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 35 }
  ];
  
  XLSX.writeFile(wb, `classes-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportSubjectsToExcel(subjects: Subject[]) {
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const data = sortedSubjects.map(s => ({
    'Название': s.name,
    'Предметная область': s.area,
    'Деление на группы': s.requiresGroupSplit ? 'Да' : 'Нет',
    'Порог деления': s.groupSplitThreshold || ''
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Предметы');
  
  ws['!cols'] = [
    { wch: 35 }, { wch: 30 }, { wch: 18 }, { wch: 15 }
  ];
  
  XLSX.writeFile(wb, `subjects-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportExtracurricularsToExcel(extracurriculars: Extracurricular[]) {
  const data = extracurriculars.map(e => ({
    'Название': e.name,
    'Направление': e.direction,
    'Часов в неделю': e.hoursPerWeek,
    'Параллели': e.targetGrades.join(', '),
    'Макс. учеников': e.maxStudents || '',
    'Курс кл. руководителя': e.isClassTeacherLed ? 'Да' : 'Нет'
  }));
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Внеурочная деятельность');
  
  ws['!cols'] = [
    { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
  ];
  
  XLSX.writeFile(wb, `extracurriculars-${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportRoomsToExcel(rooms: Room[], subjects: Subject[]) {
  const subjectById = new Map(subjects.map((s) => [s.id, s.name] as const));
  const data = rooms
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .map((r) => ({
      'Название': r.name,
      'Этаж': r.floor ?? '',
      'Универсальный': r.isUniversal ? 'Да' : 'Нет',
      'Предметы': (r.subjectIds ?? [])
        .map((id) => subjectById.get(id) ?? id)
        .filter(Boolean)
        .join(', '),
    }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Кабинеты');
  ws['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 50 }];
  XLSX.writeFile(wb, `rooms-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Экспорт распределения нагрузки в формате как на примере

type DistributionMode = "teacher" | "class" | "subject";

type FlatDistributionRow = {
  type: "Урок" | "Внеурочная деятельность";
  teacher: string;
  className: string;
  subjectOrActivity: string;
  hours: number;
  groupLabel?: string;
};

const THICK_BLACK = { rgb: "FF000000" } as const;

const thickBorder = {
  top: { style: "thick", color: THICK_BLACK },
  bottom: { style: "thick", color: THICK_BLACK },
  left: { style: "thick", color: THICK_BLACK },
  right: { style: "thick", color: THICK_BLACK },
} as const;

const setStyle = (ws: XLSX.WorkSheet, r0: number, c0: number, style: any) => {
  const addr = XLSX.utils.encode_cell({ r: r0, c: c0 });
  const cell = (ws as any)[addr];
  if (!cell) return;
  (ws as any)[addr] = {
    ...cell,
    s: {
      ...(cell.s ?? {}),
      ...style,
      font: { ...(cell.s?.font ?? {}), ...(style.font ?? {}) },
      alignment: { ...(cell.s?.alignment ?? {}), ...(style.alignment ?? {}) },
      border: { ...(cell.s?.border ?? {}), ...(style.border ?? {}) },
    },
  };
};

const sortClasses = (classes: SchoolClass[]) =>
  [...classes].sort((a, b) => (a.grade !== b.grade ? a.grade - b.grade : a.letter.localeCompare(b.letter)));

const classLabel = (c: SchoolClass) => `${c.grade}${c.letter}`;

function buildFlatRows(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[],
  includeClassTeacherLed: boolean
): FlatDistributionRow[] {
  const teacherById = new Map(teachers.map((t) => [t.id, t] as const));
  const classById = new Map(classes.map((c) => [c.id, c] as const));
  const subjectById = new Map(subjects.map((s) => [s.id, s] as const));
  const extById = new Map(extracurriculars.map((e) => [e.id, e] as const));

  const rows: FlatDistributionRow[] = [];

  for (const a of loadAssignments) {
    const t = teacherById.get(a.teacherId);
    const c = classById.get(a.classId);
    const s = subjectById.get(a.subjectId);
    if (!t || !c || !s) continue;
    rows.push({
      type: "Урок",
      teacher: t.fullName,
      className: classLabel(c),
      subjectOrActivity: s.name,
      hours: a.hoursPerWeek,
      groupLabel: a.isGroup ? `Группа ${a.groupNumber ?? ""}`.trim() : "",
    });
  }

  // Внеурочная деятельность (обычные назначения)
  for (const a of extracurricularAssignments) {
    const t = teacherById.get(a.teacherId);
    const ext = extById.get(a.extracurricularId);
    if (!t || !ext) continue;
    rows.push({
      type: "Внеурочная деятельность",
      teacher: t.fullName,
      className: "",
      subjectOrActivity: ext.name,
      hours: a.hoursPerWeek,
    });
  }

  // Курсы классного руководителя (если нужно)
  if (includeClassTeacherLed) {
    const classTeacherCourses = extracurriculars.filter((e) => e.isClassTeacherLed);
    for (const t of teachers) {
      const myClasses = classes.filter((c) => c.classTeacherId === t.id);
      for (const cls of myClasses) {
        for (const ext of classTeacherCourses) {
          if (!ext.targetGrades.includes(cls.grade)) continue;
          rows.push({
            type: "Внеурочная деятельность",
            teacher: t.fullName,
            className: classLabel(cls),
            subjectOrActivity: ext.name,
            hours: ext.hoursPerWeek,
          });
        }
      }
    }
  }

  return rows
    .filter((r) => r.hours > 0)
    .sort(
      (a, b) =>
        a.teacher.localeCompare(b.teacher, "ru") ||
        a.type.localeCompare(b.type, "ru") ||
        a.className.localeCompare(b.className, "ru") ||
        a.subjectOrActivity.localeCompare(b.subjectOrActivity, "ru")
    );
}

function makeFlatSheet(rows: FlatDistributionRow[]): XLSX.WorkSheet {
  const header = ["Тип", "Учитель", "Класс", "Предмет/Внеурочная деятельность", "Группа", "Часы"];
  const aoa: (string | number)[][] = [header];
  const rowKinds: Array<"header" | "extra" | "normal"> = ["header"];

  rows.forEach((r) => {
    aoa.push([
      r.type,
      r.teacher,
      r.className,
      r.subjectOrActivity,
      r.groupLabel ?? "",
      r.hours,
    ]);
    rowKinds.push(r.type === "Внеурочная деятельность" ? "extra" : "normal");
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 12 }, { wch: 32 }, { wch: 10 }, { wch: 44 }, { wch: 12 }, { wch: 10 }];

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let c = range.s.c; c <= range.e.c; c++) {
    setStyle(ws, 0, c, {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thickBorder,
    });
  }

  for (let r = 1; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const isTextCol = c <= 4;
      setStyle(ws, r, c, {
        alignment: { horizontal: isTextCol ? "left" : "center", vertical: "center", wrapText: true },
      });
    }
    if (rowKinds[r] === "extra") {
      for (let c = 0; c <= range.e.c; c++) setStyle(ws, r, c, { font: { italic: true } });
    }
  }

  return ws;
}

function makeTeacherMatrixSheet(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[]
): XLSX.WorkSheet {
  const sortedClasses = sortClasses(classes);
  const classNames = sortedClasses.map(classLabel);

  const header = ["Учитель", "Предмет", ...classNames, "Итого"];
  const aoa: (string | number)[][] = [header];

  type RowKind = "header" | "subject" | "extra" | "total";
  const rowKinds: RowKind[] = ["header"];

  teachers.forEach((teacher) => {
    const teacherLoads = loadAssignments.filter((a) => a.teacherId === teacher.id);
    const subjectGroups = new Map<string, Map<string, number>>();

    teacherLoads.forEach((load) => {
      const subject = subjects.find((s) => s.id === load.subjectId);
      const cls = classes.find((c) => c.id === load.classId);
      if (!subject || !cls) return;

      if (!subjectGroups.has(subject.name)) subjectGroups.set(subject.name, new Map());

      const clsName = classLabel(cls);
      const current = subjectGroups.get(subject.name)!.get(clsName) || 0;
      subjectGroups.get(subject.name)!.set(clsName, current + load.hoursPerWeek);
    });

    const teacherExtras = extracurricularAssignments.filter((a) => a.teacherId === teacher.id);
    const extraGroups = new Map<string, number>();

    teacherExtras.forEach((extra) => {
      const ext = extracurriculars.find((e) => e.id === extra.extracurricularId);
      if (!ext) return;
      extraGroups.set(ext.name, (extraGroups.get(ext.name) || 0) + extra.hoursPerWeek);
    });

    // Курсы классного руководителя
    const classTeacherExtras = extracurriculars.filter((e) => e.isClassTeacherLed);
    const myClasses = classes.filter((c) => c.classTeacherId === teacher.id);

    myClasses.forEach((cls) => {
      classTeacherExtras.forEach((ext) => {
        if (!ext.targetGrades.includes(cls.grade)) return;
        extraGroups.set(ext.name, (extraGroups.get(ext.name) || 0) + ext.hoursPerWeek);
      });
    });

    const subjectEntries = [...subjectGroups.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));
    const extraEntries = [...extraGroups.entries()].sort(([a], [b]) => a.localeCompare(b, "ru"));

    if (subjectEntries.length === 0 && extraEntries.length === 0) return;

    let isFirstRow = true;
    let totalHours = 0;

    for (const [subjectName, classHours] of subjectEntries) {
      const row: (string | number)[] = [];
      row.push(isFirstRow ? teacher.fullName : "");
      row.push(subjectName);

      let subjectTotal = 0;
      for (const clsName of classNames) {
        const hours = classHours.get(clsName) || 0;
        row.push(hours > 0 ? hours : "");
        subjectTotal += hours;
      }

      row.push(subjectTotal || "");
      totalHours += subjectTotal;
      aoa.push(row);
      rowKinds.push("subject");
      isFirstRow = false;
    }

    // внеурочка (внизу) + курсив
    for (const [extName, hours] of extraEntries) {
      const row: (string | number)[] = [];
      row.push(isFirstRow ? teacher.fullName : "");
      row.push(extName);
      for (let i = 0; i < classNames.length; i++) row.push("");
      row.push(hours || "");
      totalHours += hours;
      aoa.push(row);
      rowKinds.push("extra");
      isFirstRow = false;
    }

    // итого по учителю
    const row: (string | number)[] = [];
    row.push("");
    row.push(`Итого: ${teacher.fullName}`);

    for (const clsName of classNames) {
      let classTotal = 0;
      subjectGroups.forEach((ch) => {
        classTotal += ch.get(clsName) || 0;
      });
      row.push(classTotal || "");
    }

    row.push(totalHours || "");
    aoa.push(row);
    rowKinds.push("total");
  });

  if (aoa.length === 1) {
    toastOrNoop("Нет данных для экспорта распределения");
    return XLSX.utils.aoa_to_sheet([["Нет данных для экспорта"]]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const cols = [{ wch: 35 }, { wch: 40 }];
  classNames.forEach(() => cols.push({ wch: 8 }));
  cols.push({ wch: 10 });
  ws["!cols"] = cols;

  const range = XLSX.utils.decode_range(ws["!ref"] as string);

  // Заголовок: жирный + центр
  for (let c = range.s.c; c <= range.e.c; c++) {
    setStyle(ws, 0, c, {
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: thickBorder,
    });
  }

  for (let r = 1; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const isTextCol = c <= 1;
      setStyle(ws, r, c, {
        alignment: { horizontal: isTextCol ? "left" : "center", vertical: "center" },
      });
    }

    if (rowKinds[r] === "extra") {
      for (let c = 0; c <= range.e.c; c++) setStyle(ws, r, c, { font: { italic: true } });
    }

    if (rowKinds[r] === "total") {
      for (let c = 0; c <= range.e.c; c++) {
        setStyle(ws, r, c, {
          font: { bold: true },
          border: { bottom: { style: "thick", color: THICK_BLACK } },
        });
      }
    }
  }

  return ws;
}

function makeClassMatrixSheet(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  loadAssignments: LoadAssignment[]
): XLSX.WorkSheet {
  const sortedClasses = sortClasses(classes);
  const sortedTeachers = [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));

  const teacherNames = sortedTeachers.map((t) => t.fullName);
  const aoa: (string | number)[][] = [];
  type Kind = "header" | "row" | "total";
  const kinds: Kind[] = [];

  const teacherById = new Map(sortedTeachers.map((t) => [t.id, t] as const));
  const subjectById = new Map(subjects.map((s) => [s.id, s] as const));

  for (const cls of sortedClasses) {
    const header = ["Класс", classLabel(cls), ...new Array(teacherNames.length).fill(""), ""]; // визуальный заголовок блока
    aoa.push(header);
    kinds.push("header");

    const tableHeader = ["Предмет", ...teacherNames, "Итого"];
    aoa.push(tableHeader);
    kinds.push("header");

    const rowsBySubject = new Map<string, Map<string, number>>();

    loadAssignments
      .filter((a) => a.classId === cls.id)
      .forEach((a) => {
        const subj = subjectById.get(a.subjectId);
        const t = teacherById.get(a.teacherId);
        if (!subj || !t) return;

        if (!rowsBySubject.has(subj.name)) rowsBySubject.set(subj.name, new Map());
        const m = rowsBySubject.get(subj.name)!;
        m.set(t.fullName, (m.get(t.fullName) || 0) + a.hoursPerWeek);
      });

    const subjectNames = [...rowsBySubject.keys()].sort((a, b) => a.localeCompare(b, "ru"));

    for (const subjectName of subjectNames) {
      const byTeacher = rowsBySubject.get(subjectName)!;
      const row: (string | number)[] = [subjectName];
      let total = 0;
      for (const tn of teacherNames) {
        const h = byTeacher.get(tn) || 0;
        row.push(h > 0 ? h : "");
        total += h;
      }
      row.push(total || "");
      aoa.push(row);
      kinds.push("row");
    }

    // Итого по классу
    if (subjectNames.length > 0) {
      const row: (string | number)[] = ["Итого"];
      let grand = 0;
      for (const tn of teacherNames) {
        let sum = 0;
        rowsBySubject.forEach((m) => (sum += m.get(tn) || 0));
        row.push(sum || "");
        grand += sum;
      }
      row.push(grand || "");
      aoa.push(row);
      kinds.push("total");
    }
  }

  if (aoa.length === 0) {
    toastOrNoop("Нет данных для экспорта распределения");
    return XLSX.utils.aoa_to_sheet([["Нет данных для экспорта"]]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const cols = [{ wch: 40 }, ...teacherNames.map(() => ({ wch: 18 })), { wch: 10 }];
  ws["!cols"] = cols;

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = range.s.r; r <= range.e.r; r++) {
    const isHeader = kinds[r] === "header";
    const isTotal = kinds[r] === "total";
    for (let c = 0; c <= range.e.c; c++) {
      setStyle(ws, r, c, {
        font: isHeader || isTotal ? { bold: true } : undefined,
        alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center", wrapText: true },
      });
    }
    if (isTotal) {
      for (let c = 0; c <= range.e.c; c++) setStyle(ws, r, c, { border: { bottom: { style: "thick", color: THICK_BLACK } } });
    }
  }

  return ws;
}

function makeSubjectMatrixSheet(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  loadAssignments: LoadAssignment[]
): XLSX.WorkSheet {
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const sortedTeachers = [...teachers].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
  const sortedClasses = sortClasses(classes);

  const teacherNames = sortedTeachers.map((t) => t.fullName);
  const classNames = sortedClasses.map(classLabel);

  const aoa: (string | number)[][] = [];
  type Kind = "header" | "row" | "total";
  const kinds: Kind[] = [];

  const teacherById = new Map(sortedTeachers.map((t) => [t.id, t] as const));
  const classById = new Map(sortedClasses.map((c) => [c.id, c] as const));

  for (const subj of sortedSubjects) {
    aoa.push(["Предмет", subj.name, ...new Array(classNames.length).fill(""), ""]);
    kinds.push("header");

    const tableHeader = ["Учитель", ...classNames, "Итого"];
    aoa.push(tableHeader);
    kinds.push("header");

    const rowsByTeacher = new Map<string, Map<string, number>>();

    loadAssignments
      .filter((a) => a.subjectId === subj.id)
      .forEach((a) => {
        const t = teacherById.get(a.teacherId);
        const cls = classById.get(a.classId);
        if (!t || !cls) return;

        if (!rowsByTeacher.has(t.fullName)) rowsByTeacher.set(t.fullName, new Map());
        const m = rowsByTeacher.get(t.fullName)!;
        const cn = classLabel(cls);
        m.set(cn, (m.get(cn) || 0) + a.hoursPerWeek);
      });

    const teacherRowNames = [...rowsByTeacher.keys()].sort((a, b) => a.localeCompare(b, "ru"));

    for (const tn of teacherRowNames) {
      const byClass = rowsByTeacher.get(tn)!;
      const row: (string | number)[] = [tn];
      let total = 0;
      for (const cn of classNames) {
        const h = byClass.get(cn) || 0;
        row.push(h > 0 ? h : "");
        total += h;
      }
      row.push(total || "");
      aoa.push(row);
      kinds.push("row");
    }

    if (teacherRowNames.length > 0) {
      const row: (string | number)[] = ["Итого"];
      let grand = 0;
      for (const cn of classNames) {
        let sum = 0;
        rowsByTeacher.forEach((m) => (sum += m.get(cn) || 0));
        row.push(sum || "");
        grand += sum;
      }
      row.push(grand || "");
      aoa.push(row);
      kinds.push("total");
    }
  }

  if (aoa.length === 0) {
    toastOrNoop("Нет данных для экспорта распределения");
    return XLSX.utils.aoa_to_sheet([["Нет данных для экспорта"]]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const cols = [{ wch: 32 }, ...classNames.map(() => ({ wch: 8 })), { wch: 10 }];
  ws["!cols"] = cols;

  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = range.s.r; r <= range.e.r; r++) {
    const isHeader = kinds[r] === "header";
    const isTotal = kinds[r] === "total";
    for (let c = 0; c <= range.e.c; c++) {
      setStyle(ws, r, c, {
        font: isHeader || isTotal ? { bold: true } : undefined,
        alignment: { horizontal: c === 0 ? "left" : "center", vertical: "center", wrapText: true },
      });
    }
    if (isTotal) {
      for (let c = 0; c <= range.e.c; c++) setStyle(ws, r, c, { border: { bottom: { style: "thick", color: THICK_BLACK } } });
    }
  }

  return ws;
}

export function exportDistributionToExcel(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[]
) {
  const wb = XLSX.utils.book_new();
  const ws = makeTeacherMatrixSheet(teachers, classes, subjects, extracurriculars, loadAssignments, extracurricularAssignments);
  XLSX.utils.book_append_sheet(wb, ws, "Распределение");
  XLSX.writeFile(wb, `distribution-${new Date().toISOString().split("T")[0]}.xlsx`, {
    cellStyles: true,
  } as any);
}

export function exportDistributionByClassToExcel(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[]
) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeClassMatrixSheet(teachers, classes, subjects, loadAssignments), "Матрица");

  const flatRows = buildFlatRows(
    teachers,
    classes,
    subjects,
    extracurriculars,
    loadAssignments,
    extracurricularAssignments,
    true
  );
  XLSX.utils.book_append_sheet(wb, makeFlatSheet(flatRows), "Таблица");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `distribution-classes-${date}.xlsx`, { cellStyles: true } as any);
}

export function exportDistributionBySubjectToExcel(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[]
) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSubjectMatrixSheet(teachers, classes, subjects, loadAssignments), "Матрица");

  const flatRows = buildFlatRows(
    teachers,
    classes,
    subjects,
    extracurriculars,
    loadAssignments,
    extracurricularAssignments,
    true
  );
  XLSX.utils.book_append_sheet(wb, makeFlatSheet(flatRows), "Таблица");

  const date = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `distribution-subjects-${date}.xlsx`, { cellStyles: true } as any);
}

export function exportSelectedDistributionToExcel(
  mode: DistributionMode,
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[],
  options?: { includeExtracurricular?: boolean }
) {
  const includeExtras = Boolean(options?.includeExtracurricular);

  const teacherIds = new Set(loadAssignments.map((a) => a.teacherId));
  const selectedTeachers = teachers.filter((t) => teacherIds.has(t.id));

  const classIds = new Set(loadAssignments.map((a) => a.classId));
  const selectedClasses = classes.filter((c) => classIds.has(c.id));

  const subjectIds = new Set(loadAssignments.map((a) => a.subjectId));
  const selectedSubjects = subjects.filter((s) => subjectIds.has(s.id));

  const selectedExtras = includeExtras
    ? extracurricularAssignments.filter((a) => teacherIds.has(a.teacherId))
    : [];

  const flatRows = buildFlatRows(
    selectedTeachers,
    selectedClasses,
    selectedSubjects,
    extracurriculars,
    loadAssignments,
    selectedExtras,
    includeExtras
  );

  const wb = XLSX.utils.book_new();

  if (mode === "teacher") {
    XLSX.utils.book_append_sheet(
      wb,
      makeTeacherMatrixSheet(selectedTeachers, selectedClasses, selectedSubjects, extracurriculars, loadAssignments, selectedExtras),
      "Матрица"
    );
  }

  if (mode === "class") {
    XLSX.utils.book_append_sheet(
      wb,
      makeClassMatrixSheet(selectedTeachers, selectedClasses, selectedSubjects, loadAssignments),
      "Матрица"
    );
  }

  if (mode === "subject") {
    XLSX.utils.book_append_sheet(
      wb,
      makeSubjectMatrixSheet(selectedTeachers, selectedClasses, selectedSubjects, loadAssignments),
      "Матрица"
    );
  }

  XLSX.utils.book_append_sheet(wb, makeFlatSheet(flatRows), "Таблица");

  const date = new Date().toISOString().split("T")[0];
  const suffix = mode === "teacher" ? "teachers" : mode === "class" ? "classes" : "subjects";
  XLSX.writeFile(wb, `distribution-selected-${suffix}-${date}.xlsx`, { cellStyles: true } as any);
}


function toastOrNoop(message: string) {
  // exportUtils используется и в UI, и в headless сценариях; здесь безопаснее не падать.
  // eslint-disable-next-line no-console
  console.info(message);
}

// Экспорт всех данных в один Excel файл
export function exportAllToExcel(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  rooms: Room[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[],
  curriculumPlan: CurriculumPlan,
  weekGrid: WeekGrid,
  teacherAvailability: TeacherAvailability,
  scheduleLessons: ScheduleLesson[],
  scheduleAnchors: ScheduleAnchor[]
) {
  const wb = XLSX.utils.book_new();

  // Лист учителей
  const teachersData = teachers.map(t => ({
    'ФИО': t.fullName,
    'Должность': t.position,
    'Категория': t.qualification,
    'Предметы': t.subjects.join(', '),
    'Мин. часов': t.minHours,
    'Макс. часов': t.maxHours,
    'Статус': t.status,
    'Основной кабинет': t.primaryRoom || '',
    'Универсальный кабинет': t.isUniversalRoom ? 'Да' : 'Нет',
    'Предпочт. параллели': (t.preferredGrades ?? []).join(', '),
  }));
  if (teachersData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(teachersData);
    ws['!cols'] = [
      { wch: 35 },
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Учителя');
  }

  // Лист кабинетов
  const subjectById = new Map(subjects.map((s) => [s.id, s] as const));
  const roomsData = rooms.map((r) => ({
    'Название': r.name,
    'Этаж': r.floor ?? '',
    'Универсальный': r.isUniversal ? 'Да' : 'Нет',
    'Подходит для предметов': (r.subjectIds ?? [])
      .map((id) => subjectById.get(id)?.name)
      .filter(Boolean)
      .join(', '),
  }));
  if (roomsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(roomsData);
    ws['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 14 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Кабинеты');
  }

  // Лист классов
  const classesData = classes.map(c => {
    const classTeacher = teachers.find(t => t.id === c.classTeacherId);
    return {
      'Класс': `${c.grade}${c.letter}`,
      'Параллель': c.grade,
      'Буква': c.letter,
      'Количество учеников': c.studentCount,
      'Профиль': c.profile,
      'Классный руководитель': classTeacher?.fullName || ''
    };
  });
  if (classesData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(classesData);
    ws['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Классы');
  }

  // Лист предметов
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const subjectsData = sortedSubjects.map(s => ({
    'Название': s.name,
    'Предметная область': s.area,
    'Деление на группы': s.requiresGroupSplit ? 'Да' : 'Нет',
    'Порог деления': s.groupSplitThreshold || ''
  }));
  if (subjectsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(subjectsData);
    ws['!cols'] = [{ wch: 35 }, { wch: 30 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Предметы');
  }

  // Лист внеурочки
  const extracurricularsData = extracurriculars.map(e => ({
    'Название': e.name,
    'Направление': e.direction,
    'Часов в неделю': e.hoursPerWeek,
    'Параллели': e.targetGrades.join(', '),
    'Макс. учеников': e.maxStudents || '',
    'Курс кл. руководителя': e.isClassTeacherLed ? 'Да' : 'Нет'
  }));
  if (extracurricularsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(extracurricularsData);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Внеурочная деятельность');
  }

  // Лист учебного плана (длинный формат: предмет + класс + часы)
  const planRows = curriculumPlanToRows(subjects, classes, curriculumPlan);
  if (planRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(
      planRows.map(r => ({
        'Предмет': r.subjectName,
        'Класс': r.className,
        'Часов в неделю': r.hoursPerWeek
      }))
    );
    ws['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Учебный план');
  }

  // Лист закреплений
  const classById = new Map(classes.map((c) => [c.id, c] as const));
  const extraById = new Map(extracurriculars.map((e) => [e.id, e] as const));
  const anchorsData = scheduleAnchors.map((a) => {
    const cls = classById.get(a.classId);
    const clsLabel = cls ? `${cls.grade}${cls.letter}` : a.classId;

    const isExtra = !!a.extracurricularId;
    const itemName = isExtra
      ? extraById.get(a.extracurricularId!)?.name ?? a.extracurricularId
      : subjectById.get(a.subjectId!)?.name ?? a.subjectId;

    return {
      'Класс': clsLabel,
      'Тип': isExtra ? 'Внеурочная деятельность' : 'Предмет',
      'Предмет/Активность': itemName,
      'День': a.day,
      'Урок': a.slot,
    };
  });
  if (anchorsData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(anchorsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 22 }, { wch: 40 }, { wch: 14 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Закрепления');
  }

  // Лист настроек недели
  {
    const ws = XLSX.utils.json_to_sheet([
      {
        'Дней в неделе': weekGrid.weekType,
        'Есть 0-й урок': weekGrid.includeZeroLesson ? 'Да' : 'Нет',
        'Уроков в день': weekGrid.slotsPerDay,
      },
    ]);
    ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Сетка недели');
  }

  // Лист доступности учителей (плоский формат)
  {
    const teacherById = new Map(teachers.map((t) => [t.id, t] as const));
    const rows: Array<Record<string, string | number>> = [];
    for (const [teacherId, byDay] of Object.entries(teacherAvailability ?? {})) {
      for (const [day, bySlot] of Object.entries(byDay ?? {})) {
        for (const [slotRaw, available] of Object.entries(bySlot ?? {})) {
          rows.push({
            'Учитель': teacherById.get(teacherId)?.fullName ?? teacherId,
            'День': day,
            'Урок': Number(slotRaw),
            'Доступен': available ? 'Да' : 'Нет',
          });
        }
      }
    }
    if (rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 8 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Доступность');
    }
  }

  // Лист расписания
  {
    const teacherById = new Map(teachers.map((t) => [t.id, t] as const));
    const subjectNameById = new Map(subjects.map((s) => [s.id, s.name] as const));
    const extraNameById = new Map(extracurriculars.map((e) => [e.id, e.name] as const));

    const rows = scheduleLessons.map((l) => {
      const cls = classById.get(l.classId);
      const clsLabel = cls ? `${cls.grade}${cls.letter}` : l.classId;

      const teacherName = teacherById.get(l.teacherId)?.fullName ?? l.teacherId;
      const subjOrExtra = l.subjectId?.startsWith(EXTR_PREFIX)
        ? extraNameById.get(l.subjectId.slice(EXTR_PREFIX.length)) ?? l.subjectId
        : subjectNameById.get(l.subjectId) ?? l.subjectId;

      return {
        'Класс': clsLabel,
        'День': l.day,
        'Урок': l.slot,
        'Предмет/Внеурочная деятельность': subjOrExtra,
        'Учитель': teacherName,
        'Кабинет': l.room ?? '',
        'Группа': l.isGroup ? `Группа ${l.groupNumber ?? ''}`.trim() : '',
        'Заметки': l.notes ?? '',
        'SharedGroupId': l.sharedGroupId ?? '',
      };
    });

    if (rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 10 },
        { wch: 14 },
        { wch: 8 },
        { wch: 44 },
        { wch: 32 },
        { wch: 12 },
        { wch: 12 },
        { wch: 22 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Расписание');
    }
  }

  XLSX.writeFile(wb, `school-plan-full-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function curriculumPlanToRows(
  subjects: Subject[],
  classes: SchoolClass[],
  curriculumPlan: CurriculumPlan
): CurriculumPlanRow[] {
  const subjectById = new Map(subjects.map((s) => [s.id, s] as const));
  const classById = new Map(classes.map((c) => [c.id, c] as const));

  const parseClass = (label: string) => {
    const m = label.match(/(\d+)\s*([A-Za-zА-Яа-я]+)/);
    return {
      grade: m ? Number(m[1]) : Number.NaN,
      letter: m ? m[2].toUpperCase() : label,
    };
  };

  return Object.entries(curriculumPlan)
    .map(([key, hoursPerWeek]) => {
      const [subjectId, classId] = key.split('_');
      const subj = subjectById.get(subjectId);
      const cls = classById.get(classId);
      if (!subj || !cls) return null;
      return {
        subjectName: subj.name,
        className: `${cls.grade}${cls.letter}`,
        hoursPerWeek: Number(hoursPerWeek) || 0,
      } satisfies CurriculumPlanRow;
    })
    .filter((r): r is CurriculumPlanRow => !!r && r.hoursPerWeek > 0)
    .sort((a, b) => {
      const ca = parseClass(a.className);
      const cb = parseClass(b.className);
      const gradeCmp = (ca.grade || 0) - (cb.grade || 0);
      if (gradeCmp !== 0) return gradeCmp;
      const letterCmp = ca.letter.localeCompare(cb.letter, 'ru');
      if (letterCmp !== 0) return letterCmp;
      return a.subjectName.localeCompare(b.subjectName, 'ru');
    });
}

export function exportCurriculumPlanToExcel(subjects: Subject[], classes: SchoolClass[], curriculumPlan: CurriculumPlan) {
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const sortedClasses = sortClasses(classes);
  const classNames = sortedClasses.map(classLabel);

  // 1) Матрица (как на вкладке «Учебный план»)
  const aoa: (string | number)[][] = [["Предмет", ...classNames]];

  const totalsByClass = new Map<string, number>(classNames.map((n) => [n, 0]));

  for (const subj of sortedSubjects) {
    const row: (string | number)[] = [subj.name];
    for (const cls of sortedClasses) {
      const hours = Number(curriculumPlan[`${subj.id}_${cls.id}`] ?? 0);
      row.push(hours > 0 ? hours : "");
      if (hours > 0) {
        const cn = classLabel(cls);
        totalsByClass.set(cn, (totalsByClass.get(cn) || 0) + hours);
      }
    }
    aoa.push(row);
  }

  // ИТОГО (как в UI)
  const totalRow: (string | number)[] = ["ИТОГО"];
  for (const cn of classNames) totalRow.push(totalsByClass.get(cn) || "");
  aoa.push(totalRow);

  const wsMatrix = XLSX.utils.aoa_to_sheet(aoa);
  wsMatrix['!cols'] = [{ wch: 34 }, ...classNames.map(() => ({ wch: 9 }))];

  const range = XLSX.utils.decode_range(wsMatrix['!ref'] as string);
  // header
  for (let c = range.s.c; c <= range.e.c; c++) {
    setStyle(wsMatrix, 0, c, {
      font: { bold: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thickBorder,
    });
  }
  // totals row styling
  const lastRow = range.e.r;
  for (let c = range.s.c; c <= range.e.c; c++) {
    setStyle(wsMatrix, lastRow, c, {
      font: { bold: true },
      border: { top: { style: 'thick', color: THICK_BLACK } },
      alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' },
    });
  }

  // 2) Плоская таблица
  const flatRows = curriculumPlanToRows(subjects, classes, curriculumPlan).map((r) => ({
    'Предмет': r.subjectName,
    'Класс': r.className,
    'Часов в неделю': r.hoursPerWeek,
  }));
  const wsFlat = XLSX.utils.json_to_sheet(flatRows);
  wsFlat['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Матрица');
  XLSX.utils.book_append_sheet(wb, wsFlat, 'Таблица');

  XLSX.writeFile(wb, `curriculum-plan-${new Date().toISOString().split('T')[0]}.xlsx`, { cellStyles: true } as any);
}

export function exportCurriculumPlanToCSV(subjects: Subject[], classes: SchoolClass[], curriculumPlan: CurriculumPlan) {
  const headers = ['Предмет', 'Класс', 'Часов в неделю'];
  const rows = curriculumPlanToRows(subjects, classes, curriculumPlan).map(r => [
    r.subjectName,
    r.className,
    String(r.hoursPerWeek),
  ]);

  const escapeCsv = (v: unknown) => String(v).replace(/"/g, '""');

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${escapeCsv(cell)}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `curriculum-plan-${new Date().toISOString().split('T')[0]}.csv`);
}

export function parseCurriculumPlanFromData(data: any[][]): CurriculumPlanRow[] {
  const rows: CurriculumPlanRow[] = [];
  const headers = data[0]?.map(h => String(h).toLowerCase().trim()) || [];

  const subjectIndex = headers.findIndex(h => h.includes('предмет') || h.includes('название') || h.includes('subject'));
  const classIndex = headers.findIndex(h => h === 'класс' || h.includes('class'));
  const hoursIndex = headers.findIndex(h => h.includes('час'));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const subjectName = row[subjectIndex >= 0 ? subjectIndex : 0]?.toString().trim();
    const className = row[classIndex >= 0 ? classIndex : 1]?.toString().trim();
    const hoursRaw = row[hoursIndex >= 0 ? hoursIndex : 2];

    if (!subjectName || !className) continue;

    const hoursPerWeek = Number(hoursRaw);
    if (!Number.isFinite(hoursPerWeek) || hoursPerWeek <= 0) continue;

    rows.push({ subjectName, className, hoursPerWeek });
  }

  return rows;
}

// === CSV Export ===

export function exportTeachersToCSV(teachers: Teacher[]) {
  const headers = [
    'ФИО',
    'Должность',
    'Категория',
    'Предметы',
    'Мин. часов',
    'Макс. часов',
    'Статус',
    'Основной кабинет',
    'Универсальный кабинет',
    'Предпочт. параллели',
  ];
  const rows = teachers.map(t => [
    t.fullName,
    t.position,
    t.qualification,
    t.subjects.join('; '),
    t.minHours.toString(),
    t.maxHours.toString(),
    t.status,
    t.primaryRoom || '',
    t.isUniversalRoom ? 'Да' : 'Нет',
    (t.preferredGrades ?? []).join('; '),
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `teachers-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportClassesToCSV(classes: SchoolClass[], teachers: Teacher[]) {
  const headers = ['Класс', 'Параллель', 'Буква', 'Количество учеников', 'Профиль', 'Классный руководитель'];
  const rows = classes.map(c => {
    const classTeacher = teachers.find(t => t.id === c.classTeacherId);
    return [
      `${c.grade}${c.letter}`,
      c.grade.toString(),
      c.letter,
      c.studentCount.toString(),
      c.profile,
      classTeacher?.fullName || ''
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `classes-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportSubjectsToCSV(subjects: Subject[]) {
  const headers = ['Название', 'Предметная область', 'Деление на группы', 'Порог деления'];
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const rows = sortedSubjects.map(s => [
    s.name,
    s.area,
    s.requiresGroupSplit ? 'Да' : 'Нет',
    s.groupSplitThreshold?.toString() || ''
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `subjects-${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportExtracurricularsToCSV(extracurriculars: Extracurricular[]) {
  const headers = ['Название', 'Направление', 'Часов в неделю', 'Параллели', 'Макс. учеников', 'Курс кл. руководителя'];
  const rows = extracurriculars.map(e => [
    e.name,
    e.direction,
    e.hoursPerWeek.toString(),
    e.targetGrades.join('; '),
    e.maxStudents?.toString() || '',
    e.isClassTeacherLed ? 'Да' : 'Нет'
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `extracurriculars-${new Date().toISOString().split('T')[0]}.csv`);
}

// === Excel/CSV Import ===

export async function parseExcelFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Ошибка чтения Excel файла'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseCSVFile(file: File): Promise<any[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => {
          // Simple CSV parsing (handles quoted fields)
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        }).filter(row => row.some(cell => cell.length > 0));
        
        resolve(rows);
      } catch (error) {
        reject(new Error('Ошибка чтения CSV файла'));
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}

// Парсинг учителей из Excel/CSV
export function parseTeachersFromData(data: any[][]): Omit<Teacher, 'id'>[] {
  const teachers: Omit<Teacher, 'id'>[] = [];
  const headers = data[0]?.map(h => String(h).toLowerCase().trim()) || [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const fioIndex = headers.findIndex(h => h.includes('фио') || h.includes('имя') || h.includes('учитель'));
    const positionIndex = headers.findIndex(h => h.includes('должность'));
    const qualIndex = headers.findIndex(h => h.includes('категория') || h.includes('квалификация'));
    const subjectsIndex = headers.findIndex(h => h.includes('предмет'));
    const minHoursIndex = headers.findIndex(h => h.includes('мин') && h.includes('час'));
    const maxHoursIndex = headers.findIndex(h => h.includes('макс') && h.includes('час'));
    const statusIndex = headers.findIndex(h => h.includes('статус'));

    const primaryRoomIndex = headers.findIndex(h => h.includes('основн') && h.includes('кабин'));
    const universalRoomIndex = headers.findIndex(h => h.includes('универс') && h.includes('кабин'));
    const preferredGradesIndex = headers.findIndex(h => h.includes('предпоч') && (h.includes('паралл') || h.includes('класс')));
    
    const fullName = row[fioIndex >= 0 ? fioIndex : 0]?.toString().trim();
    if (!fullName) continue;
    
    const qualificationRaw = row[qualIndex >= 0 ? qualIndex : 2]?.toString().toLowerCase().trim() || '';
    let qualification: Teacher['qualification'] = 'без категории';
    if (qualificationRaw.includes('высш')) qualification = 'высшая';
    else if (qualificationRaw.includes('перв')) qualification = 'первая';
    
    const subjectsRaw = row[subjectsIndex >= 0 ? subjectsIndex : 3]?.toString() || '';
    const subjects = subjectsRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
    
    const statusRaw = row[statusIndex >= 0 ? statusIndex : 6]?.toString().toLowerCase().trim() || '';
    let status: Teacher['status'] = 'штатный';
    if (statusRaw.includes('внешн')) status = 'внешний совместитель';
    else if (statusRaw.includes('внутр')) status = 'внутренний совместитель';

    const primaryRoom = (row[primaryRoomIndex] ?? '').toString().trim();
    const universalRaw = (row[universalRoomIndex] ?? '').toString().toLowerCase().trim();
    const isUniversalRoom = universalRaw === 'да' || universalRaw === 'true' || universalRaw === '1';

    const preferredRaw = (row[preferredGradesIndex] ?? '').toString();
    const preferredGrades = preferredRaw
      ? preferredRaw
          .split(/[,;]/)
          .map((x) => parseInt(x.trim()))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 11)
      : undefined;
    
    teachers.push({
      fullName,
      position: row[positionIndex >= 0 ? positionIndex : 1]?.toString().trim() || 'Учитель',
      qualification,
      subjects,
      minHours: parseInt(row[minHoursIndex >= 0 ? minHoursIndex : 4]) || 18,
      maxHours: parseInt(row[maxHoursIndex >= 0 ? maxHoursIndex : 5]) || 36,
      status,
      primaryRoom: primaryRoom || undefined,
      isUniversalRoom: isUniversalRoom || undefined,
      preferredGrades,
    });
  }
  
  return teachers;
}

export function parseRoomsFromData(data: any[][], subjects: Subject[]): Omit<Room, 'id'>[] {
  const rooms: Omit<Room, 'id'>[] = [];
  const headers = data[0]?.map((h) => String(h).toLowerCase().trim()) || [];

  const nameIndex = headers.findIndex((h) => h.includes('назван') || h.includes('кабин') || h === 'name');
  const floorIndex = headers.findIndex((h) => h.includes('этаж') || h.includes('floor'));
  const universalIndex = headers.findIndex((h) => h.includes('универс'));
  const subjectsIndex = headers.findIndex((h) => h.includes('предмет'));

  const normalize = (s: string) => s.trim().toLowerCase();
  const subjectByName = new Map(subjects.map((s) => [normalize(s.name), s.id] as const));

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const name = (row[nameIndex >= 0 ? nameIndex : 0] ?? '').toString().trim();
    if (!name) continue;

    const floorRaw = row[floorIndex >= 0 ? floorIndex : -1];
    const floor = floorRaw === undefined || floorRaw === null || String(floorRaw).trim() === '' ? undefined : Number(floorRaw);

    const unRaw = (row[universalIndex >= 0 ? universalIndex : -1] ?? '').toString().toLowerCase().trim();
    const isUniversal = unRaw === 'да' || unRaw === 'true' || unRaw === '1';

    const subjectsRaw = (row[subjectsIndex >= 0 ? subjectsIndex : -1] ?? '').toString();
    const subjectIds = subjectsRaw
      ? subjectsRaw
          .split(/[,;]/)
          .map((x) => normalize(x))
          .map((n) => subjectByName.get(n))
          .filter((x): x is string => !!x)
      : [];

    rooms.push({
      name,
      floor: Number.isFinite(floor as number) ? floor : undefined,
      isUniversal,
      subjectIds: Array.from(new Set(subjectIds)),
    });
  }

  return rooms;
}

// Парсинг классов из Excel/CSV
export function parseClassesFromData(data: any[][]): Omit<SchoolClass, 'id'>[] {
  const classes: Omit<SchoolClass, 'id'>[] = [];
  const headers = data[0]?.map(h => String(h).toLowerCase().trim()) || [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const classIndex = headers.findIndex(h => h.includes('класс') && !h.includes('руководитель'));
    const gradeIndex = headers.findIndex(h => h.includes('параллель') || h.includes('grade'));
    const letterIndex = headers.findIndex(h => h.includes('буква') || h.includes('letter'));
    const studentsIndex = headers.findIndex(h => h.includes('ученик') || h.includes('количество'));
    const profileIndex = headers.findIndex(h => h.includes('профиль'));
    
    let grade: number;
    let letter: string;
    
    if (classIndex >= 0 && row[classIndex]) {
      const classStr = row[classIndex].toString().trim();
      const match = classStr.match(/(\d+)([А-Яа-яA-Za-z]+)/);
      if (match) {
        grade = parseInt(match[1]);
        letter = match[2].toUpperCase();
      } else {
        continue;
      }
    } else {
      grade = parseInt(row[gradeIndex >= 0 ? gradeIndex : 0]);
      letter = (row[letterIndex >= 0 ? letterIndex : 1]?.toString() || 'А').toUpperCase();
    }
    
    if (!grade || grade < 1 || grade > 11) continue;
    
    const profileRaw = row[profileIndex >= 0 ? profileIndex : 4]?.toString().toLowerCase().trim() || '';
    let profile: SchoolClass['profile'] = 'общеобразовательный';
    if (profileRaw.includes('гуман')) profile = 'гуманитарный';
    else if (profileRaw.includes('соц') || profileRaw.includes('эконом')) profile = 'социально-экономический';
    else if (profileRaw.includes('техн')) profile = 'технологический';
    else if (profileRaw.includes('естеств')) profile = 'естественно-научный';
    else if (profileRaw.includes('универ')) profile = 'универсальный';
    
    classes.push({
      grade,
      letter,
      studentCount: parseInt(row[studentsIndex >= 0 ? studentsIndex : 3]) || 25,
      profile
    });
  }
  
  return classes;
}

// Парсинг предметов из Excel/CSV
export function parseSubjectsFromData(data: any[][]): Omit<Subject, 'id'>[] {
  const subjects: Omit<Subject, 'id'>[] = [];
  const headers = data[0]?.map(h => String(h).toLowerCase().trim()) || [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const nameIndex = headers.findIndex(h => h.includes('название') || h.includes('предмет') || h.includes('name'));
    const areaIndex = headers.findIndex(h => h.includes('область') || h.includes('area'));
    const splitIndex = headers.findIndex(h => h.includes('делен') || h.includes('групп'));
    const thresholdIndex = headers.findIndex(h => h.includes('порог'));
    
    const name = row[nameIndex >= 0 ? nameIndex : 0]?.toString().trim();
    if (!name) continue;
    
    const splitRaw = row[splitIndex >= 0 ? splitIndex : 2]?.toString().toLowerCase().trim() || '';
    const requiresGroupSplit = splitRaw === 'да' || splitRaw === 'true' || splitRaw === '1';
    
    subjects.push({
      name,
      area: row[areaIndex >= 0 ? areaIndex : 1]?.toString().trim() || 'Общие',
      requiresGroupSplit,
      groupSplitThreshold: parseInt(row[thresholdIndex >= 0 ? thresholdIndex : 3]) || undefined
    });
  }
  
  return subjects;
}

// Парсинг внеурочки из Excel/CSV
export function parseExtracurricularsFromData(data: any[][]): Omit<Extracurricular, 'id'>[] {
  const extracurriculars: Omit<Extracurricular, 'id'>[] = [];
  const headers = data[0]?.map(h => String(h).toLowerCase().trim()) || [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const nameIndex = headers.findIndex(h => h.includes('название') || h.includes('курс') || h.includes('name'));
    const directionIndex = headers.findIndex(h => h.includes('направлен'));
    const hoursIndex = headers.findIndex(h => h.includes('час'));
    const gradesIndex = headers.findIndex(h => h.includes('параллел') || h.includes('класс') || h.includes('grade'));
    const maxStudentsIndex = headers.findIndex(h => h.includes('учеников') || h.includes('макс'));
    const classTeacherIndex = headers.findIndex(h => h.includes('классн') || h.includes('руководител'));
    
    const name = row[nameIndex >= 0 ? nameIndex : 0]?.toString().trim();
    if (!name) continue;
    
    const directionRaw = row[directionIndex >= 0 ? directionIndex : 1]?.toString().toLowerCase().trim() || '';
    let direction: Extracurricular['direction'] = 'общекультурное';
    if (directionRaw.includes('спорт')) direction = 'спортивное';
    else if (directionRaw.includes('творч')) direction = 'творческое';
    else if (directionRaw.includes('интеллект')) direction = 'интеллектуальное';
    else if (directionRaw.includes('соц')) direction = 'социальное';
    
    const gradesRaw = row[gradesIndex >= 0 ? gradesIndex : 3]?.toString() || '';
    const targetGrades = gradesRaw.split(/[,;]/).map(g => parseInt(g.trim())).filter(g => g >= 1 && g <= 11);
    
    const classTeacherRaw = row[classTeacherIndex >= 0 ? classTeacherIndex : 5]?.toString().toLowerCase().trim() || '';
    const isClassTeacherLed = classTeacherRaw === 'да' || classTeacherRaw === 'true' || classTeacherRaw === '1';
    
    extracurriculars.push({
      name,
      direction,
      hoursPerWeek: parseInt(row[hoursIndex >= 0 ? hoursIndex : 2]) || 1,
      targetGrades: targetGrades.length > 0 ? targetGrades : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      maxStudents: parseInt(row[maxStudentsIndex >= 0 ? maxStudentsIndex : 4]) || undefined,
      isClassTeacherLed
    });
  }
  
  return extracurriculars;
}
