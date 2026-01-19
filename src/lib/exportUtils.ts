import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type {
  Teacher,
  SchoolClass,
  Subject,
  Extracurricular,
  LoadAssignment,
  ExtracurricularAssignment,
  CurriculumPlan
} from '@/types';

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
  extracurriculars: Extracurricular[];
  loadAssignments: LoadAssignment[];
  extracurricularAssignments: ExtracurricularAssignment[];
  curriculumPlan: CurriculumPlan;
}) {
  const jsonString = JSON.stringify(data, null, 2);
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
    'Статус': t.status
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
    { wch: 25 }  // Статус
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
  const data = subjects.map(s => ({
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
  XLSX.utils.book_append_sheet(wb, ws, 'Внеурочка');
  
  ws['!cols'] = [
    { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 }
  ];
  
  XLSX.writeFile(wb, `extracurriculars-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Экспорт распределения нагрузки в формате как на примере
export function exportDistributionToExcel(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[]
) {
  const wb = XLSX.utils.book_new();
  
  // Группируем классы по параллелям и сортируем
  const sortedClasses = [...classes].sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.letter.localeCompare(b.letter);
  });
  
  // Создаём данные для таблицы распределения
  const rows: any[] = [];
  
  teachers.forEach(teacher => {
    // Нагрузка по предметам
    const teacherLoads = loadAssignments.filter(a => a.teacherId === teacher.id);
    const subjectGroups = new Map<string, Map<string, number>>();
    
    teacherLoads.forEach(load => {
      const subject = subjects.find(s => s.id === load.subjectId);
      const cls = classes.find(c => c.id === load.classId);
      if (subject && cls) {
        if (!subjectGroups.has(subject.name)) {
          subjectGroups.set(subject.name, new Map());
        }
        const className = `${cls.grade}${cls.letter}`;
        const current = subjectGroups.get(subject.name)!.get(className) || 0;
        subjectGroups.get(subject.name)!.set(className, current + load.hoursPerWeek);
      }
    });
    
    // Внеурочка
    const teacherExtras = extracurricularAssignments.filter(a => a.teacherId === teacher.id);
    const extraGroups = new Map<string, number>();
    
    teacherExtras.forEach(extra => {
      const ext = extracurriculars.find(e => e.id === extra.extracurricularId);
      if (ext) {
        const current = extraGroups.get(ext.name) || 0;
        extraGroups.set(ext.name, current + extra.hoursPerWeek);
      }
    });
    
    // Курсы классного руководителя
    const classTeacherExtras = extracurriculars.filter(e => e.isClassTeacherLed);
    const myClasses = classes.filter(c => c.classTeacherId === teacher.id);
    
    myClasses.forEach(cls => {
      classTeacherExtras.forEach(ext => {
        if (ext.targetGrades.includes(cls.grade)) {
          const current = extraGroups.get(ext.name) || 0;
          extraGroups.set(ext.name, current + ext.hoursPerWeek);
        }
      });
    });
    
    // Добавляем строки для каждого предмета
    let isFirstRow = true;
    let totalHours = 0;
    
    subjectGroups.forEach((classHours, subjectName) => {
      const row: any = {
        'Учитель': isFirstRow ? teacher.fullName : ''
      };
      row['Предмет'] = subjectName;
      
      let subjectTotal = 0;
      sortedClasses.forEach(cls => {
        const className = `${cls.grade}${cls.letter}`;
        const hours = classHours.get(className) || '';
        row[className] = hours;
        if (hours) subjectTotal += hours;
      });
      
      row['Итого'] = subjectTotal;
      totalHours += subjectTotal;
      rows.push(row);
      isFirstRow = false;
    });
    
    // Добавляем внеурочку
    extraGroups.forEach((hours, extName) => {
      const row: any = {
        'Учитель': isFirstRow ? teacher.fullName : '',
        'Предмет': extName
      };
      sortedClasses.forEach(cls => {
        row[`${cls.grade}${cls.letter}`] = '';
      });
      row['Итого'] = hours;
      totalHours += hours;
      rows.push(row);
      isFirstRow = false;
    });
    
    // Итого по учителю
    if (subjectGroups.size > 0 || extraGroups.size > 0) {
      const totalRow: any = {
        'Учитель': '',
        'Предмет': `Итого: ${teacher.fullName}`
      };
      
      // Подсчитываем часы по классам
      sortedClasses.forEach(cls => {
        const className = `${cls.grade}${cls.letter}`;
        let classTotal = 0;
        subjectGroups.forEach(classHours => {
          classTotal += classHours.get(className) || 0;
        });
        totalRow[className] = classTotal || '';
      });
      
      totalRow['Итого'] = totalHours;
      rows.push(totalRow);
      rows.push({}); // Пустая строка-разделитель
    }
  });
  
  if (rows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Ширина колонок
    const cols = [{ wch: 35 }, { wch: 40 }];
    sortedClasses.forEach(() => cols.push({ wch: 8 }));
    cols.push({ wch: 10 });
    ws['!cols'] = cols;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Распределение');
  }
  
  XLSX.writeFile(wb, `distribution-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Экспорт всех данных в один Excel файл
export function exportAllToExcel(
  teachers: Teacher[],
  classes: SchoolClass[],
  subjects: Subject[],
  extracurriculars: Extracurricular[],
  loadAssignments: LoadAssignment[],
  extracurricularAssignments: ExtracurricularAssignment[],
  curriculumPlan: CurriculumPlan
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
    'Статус': t.status
  }));
  if (teachersData.length > 0) {
    const ws = XLSX.utils.json_to_sheet(teachersData);
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Учителя');
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
  const subjectsData = subjects.map(s => ({
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
    XLSX.utils.book_append_sheet(wb, ws, 'Внеурочка');
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

  XLSX.writeFile(wb, `school-plan-full-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function curriculumPlanToRows(
  subjects: Subject[],
  classes: SchoolClass[],
  curriculumPlan: CurriculumPlan
): CurriculumPlanRow[] {
  const subjectById = new Map(subjects.map(s => [s.id, s] as const));
  const classById = new Map(classes.map(c => [c.id, c] as const));

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
    .sort((a, b) => a.className.localeCompare(b.className) || a.subjectName.localeCompare(b.subjectName));
}

export function exportCurriculumPlanToExcel(subjects: Subject[], classes: SchoolClass[], curriculumPlan: CurriculumPlan) {
  const rows = curriculumPlanToRows(subjects, classes, curriculumPlan).map(r => ({
    'Предмет': r.subjectName,
    'Класс': r.className,
    'Часов в неделю': r.hoursPerWeek,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Учебный план');
  ws['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 14 }];

  XLSX.writeFile(wb, `curriculum-plan-${new Date().toISOString().split('T')[0]}.xlsx`);
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
  const headers = ['ФИО', 'Должность', 'Категория', 'Предметы', 'Мин. часов', 'Макс. часов', 'Статус'];
  const rows = teachers.map(t => [
    t.fullName,
    t.position,
    t.qualification,
    t.subjects.join('; '),
    t.minHours.toString(),
    t.maxHours.toString(),
    t.status
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
  const rows = subjects.map(s => [
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
    
    teachers.push({
      fullName,
      position: row[positionIndex >= 0 ? positionIndex : 1]?.toString().trim() || 'Учитель',
      qualification,
      subjects,
      minHours: parseInt(row[minHoursIndex >= 0 ? minHoursIndex : 4]) || 18,
      maxHours: parseInt(row[maxHoursIndex >= 0 ? maxHoursIndex : 5]) || 36,
      status
    });
  }
  
  return teachers;
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
