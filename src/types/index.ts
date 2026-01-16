// Типы данных для системы управления учебным планом

export interface Teacher {
  id: string;
  fullName: string;
  position: string;
  qualification: 'без категории' | 'первая' | 'высшая';
  subjects: string[];
  minHours: number; // минимальная нагрузка в часах
  maxHours: number; // максимальная нагрузка в часах
  status: 'штатный' | 'внешний совместитель' | 'внутренний совместитель';
}

export interface SchoolClass {
  id: string;
  grade: number; // 1-11
  letter: string; // А, Б, В...
  studentCount: number;
  profile: 'общеобразовательный' | 'гуманитарный' | 'социально-экономический' | 'технологический' | 'естественно-научный' | 'универсальный';
}

export interface Subject {
  id: string;
  name: string;
  area: string; // предметная область
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

// Учебный план: часы по предметам и классам
// Ключ: `${subjectId}_${classId}`, значение: часы в неделю
export type CurriculumPlan = Record<string, number>;

export interface TeacherLoad {
  teacherId: string;
  teacherName: string;
  subjectHours: { subjectName: string; className: string; hours: number }[];
  extracurricularHours: { name: string; hours: number }[];
  totalHours: number;
  minHours: number;
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
  curriculumPlan: CurriculumPlan;
}
