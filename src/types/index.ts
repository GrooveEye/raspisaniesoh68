// Типы данных для системы управления учебным планом

export interface Teacher {
  id: string;
  fullName: string;
  position: string;
  qualification: 'без категории' | 'первая' | 'высшая';
  subjects: string[];
  rate: number; // ставка: 0.5, 1.0, 1.5 и т.д.
  maxHours: number; // максимальная нагрузка в часах
  status: 'штатный' | 'внешний совместитель' | 'внутренний совместитель';
}

export interface SchoolClass {
  id: string;
  grade: number; // 1-11
  letter: string; // А, Б, В...
  studentCount: number;
  profile: 'общеобразовательный' | 'гуманитарный' | 'технический' | 'естественнонаучный';
}

export interface Subject {
  id: string;
  name: string;
  area: string; // предметная область
  hoursPerWeek: Record<number, number>; // часы по параллелям: { 1: 4, 2: 4, ... }
  requiresGroupSplit: boolean; // деление на группы
  groupSplitThreshold?: number; // порог для деления (кол-во учеников)
}

export interface Extracurricular {
  id: string;
  name: string;
  direction: 'спортивное' | 'творческое' | 'интеллектуальное' | 'социальное' | 'общекультурное';
  hoursPerWeek: number;
  targetGrades: number[]; // для каких параллелей
  maxStudents?: number;
}

export interface LoadAssignment {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  hoursPerWeek: number;
  isGroup?: boolean; // если это группа (деление класса)
  groupNumber?: number; // номер группы
}

export interface ExtracurricularAssignment {
  id: string;
  teacherId: string;
  extracurricularId: string;
  classIds: string[];
  hoursPerWeek: number;
}

export interface TeacherLoad {
  teacherId: string;
  teacherName: string;
  subjectHours: { subjectName: string; className: string; hours: number }[];
  extracurricularHours: { name: string; hours: number }[];
  totalHours: number;
  rate: number;
  maxHours: number;
  loadPercentage: number;
}

// Состояние приложения
export interface AppState {
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  extracurriculars: Extracurricular[];
  loadAssignments: LoadAssignment[];
  extracurricularAssignments: ExtracurricularAssignment[];
}
