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
  /**
   * Основной кабинет учителя (например: "101", "спортзал").
   * Если учитель работает в разных кабинетах, можно отметить isUniversalRoom.
   */
  primaryRoom?: string;
  /** Учитель работает в разных кабинетах (универсальный) */
  isUniversalRoom?: boolean;
  /**
   * Приоритетные параллели (номер класса 1–11), где учителю предпочтительнее вести предмет.
   * Если не указано, считается что предпочтений нет.
   */
  preferredGrades?: number[];
}

export interface SchoolClass {
  id: string;
  grade: number; // 1-11
  letter: string; // А, Б, В...
  studentCount: number;
  profile: 'общеобразовательный' | 'гуманитарный' | 'социально-экономический' | 'технологический' | 'естественно-научный' | 'универсальный';
  classTeacherId?: string; // ID классного руководителя
}

export interface Subject {
  id: string;
  name: string;
  area: string; // предметная область
  requiresGroupSplit: boolean; // деление на группы
  groupSplitThreshold?: number; // порог для деления (кол-во учеников)
}

export interface Room {
  id: string;
  /** Номер или название (например: "101", "спортзал") */
  name: string;
  /** Этаж (необязательно) */
  floor?: number;
  /** Кабинет универсальный (может использоваться разными предметами) */
  isUniversal: boolean;
  /** Предметы, для которых кабинет подходит (если не универсальный) */
  subjectIds: string[];
}

export interface Extracurricular {
  id: string;
  name: string;
  direction: 'спортивное' | 'творческое' | 'интеллектуальное' | 'социальное' | 'общекультурное';
  hoursPerWeek: number;
  targetGrades: number[]; // для каких параллелей
  maxStudents?: number;
  isClassTeacherLed?: boolean; // ведёт классный руководитель (для каждого класса свой учитель)
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
  targetGrades: number[]; // для каких параллелей (информационно)
  hoursPerWeek: number;
}

// ===== Расписание =====

export type WeekType = 5 | 6;

export interface WeekGrid {
  weekType: WeekType; // 5 или 6 дней
  includeZeroLesson: boolean; // показывать 0-й урок
  slotsPerDay: number; // количество уроков в день (без учёта 0-го)
}

// Доступность учителя по слотам недели
// true = доступен, false = недоступен
export type TeacherAvailability = Record<
  string,
  Record<string, Record<number, boolean>>
>;

export interface ScheduleLesson {
  id: string;
  classId: string;
  day: string;
  slot: number; // 1..slotsPerDay
  subjectId: string;
  teacherId: string;
  room?: string; // кабинет/ресурс (строкой), если нужен
  isGroup?: boolean;
  groupNumber?: number;
  notes?: string;
}

export interface ScheduleAnchor {
  id: string;
  classId: string;
  /** Закрепление может относиться к предмету или к внеурочной деятельности */
  subjectId?: string;
  extracurricularId?: string;
  day: string;
  slot: number;
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
  rooms: Room[];
  extracurriculars: Extracurricular[];
  loadAssignments: LoadAssignment[];
  extracurricularAssignments: ExtracurricularAssignment[];
  curriculumPlan: CurriculumPlan;

  weekGrid: WeekGrid;
  teacherAvailability: TeacherAvailability;
  scheduleLessons: ScheduleLesson[];
  scheduleAnchors: ScheduleAnchor[];
}
