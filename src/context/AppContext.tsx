import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { 
  Teacher, 
  SchoolClass, 
  Subject, 
  Extracurricular, 
  LoadAssignment,
  ExtracurricularAssignment,
  CurriculumPlan 
} from '@/types';

interface AppContextType {
  // Данные
  teachers: Teacher[];
  classes: SchoolClass[];
  subjects: Subject[];
  extracurriculars: Extracurricular[];
  loadAssignments: LoadAssignment[];
  extracurricularAssignments: ExtracurricularAssignment[];
  curriculumPlan: CurriculumPlan;
  
  // Методы для учителей
  addTeacher: (teacher: Teacher) => void;
  updateTeacher: (id: string, teacher: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  
  // Методы для классов
  addClass: (schoolClass: SchoolClass) => void;
  updateClass: (id: string, schoolClass: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;
  
  // Методы для предметов
  addSubject: (subject: Subject) => void;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  
  // Методы для внеурочной деятельности
  addExtracurricular: (extracurricular: Extracurricular) => void;
  updateExtracurricular: (id: string, extracurricular: Partial<Extracurricular>) => void;
  deleteExtracurricular: (id: string) => void;
  
  // Методы для распределения нагрузки
  addLoadAssignment: (assignment: LoadAssignment) => void;
  updateLoadAssignment: (id: string, assignment: Partial<LoadAssignment>) => void;
  deleteLoadAssignment: (id: string) => void;
  setLoadAssignments: (assignments: LoadAssignment[]) => void;
  
  // Методы для распределения внеурочки
  addExtracurricularAssignment: (assignment: ExtracurricularAssignment) => void;
  updateExtracurricularAssignment: (id: string, assignment: Partial<ExtracurricularAssignment>) => void;
  deleteExtracurricularAssignment: (id: string) => void;
  
  // Методы для учебного плана
  setCurriculumHours: (subjectId: string, classId: string, hours: number) => void;
  getCurriculumHours: (subjectId: string, classId: string) => number;
  clearCurriculumPlan: () => void;
  
  // Импорт/экспорт
  importData: (data: Partial<{
    teachers: Teacher[];
    classes: SchoolClass[];
    subjects: Subject[];
    extracurriculars: Extracurricular[];
    curriculumPlan: CurriculumPlan;
  }>) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [teachers, setTeachers] = useLocalStorage<Teacher[]>('school-plan-teachers', []);
  const [classes, setClasses] = useLocalStorage<SchoolClass[]>('school-plan-classes', []);
  const [subjects, setSubjects] = useLocalStorage<Subject[]>('school-plan-subjects', []);
  const [extracurriculars, setExtracurriculars] = useLocalStorage<Extracurricular[]>('school-plan-extracurriculars', []);
  const [loadAssignments, setLoadAssignments] = useLocalStorage<LoadAssignment[]>('school-plan-load-assignments', []);
  const [extracurricularAssignments, setExtracurricularAssignments] = useLocalStorage<ExtracurricularAssignment[]>('school-plan-extracurricular-assignments', []);
  const [curriculumPlan, setCurriculumPlan] = useLocalStorage<CurriculumPlan>('school-plan-curriculum', {});

  // Учителя
  const addTeacher = (teacher: Teacher) => {
    setTeachers(prev => [...prev, teacher]);
  };
  
  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  
  const deleteTeacher = (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    // Удаляем связанные назначения
    setLoadAssignments(prev => prev.filter(a => a.teacherId !== id));
    setExtracurricularAssignments(prev => prev.filter(a => a.teacherId !== id));
  };

  // Классы
  const addClass = (schoolClass: SchoolClass) => {
    setClasses(prev => [...prev, schoolClass]);
  };
  
  const updateClass = (id: string, updates: Partial<SchoolClass>) => {
    setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };
  
  const deleteClass = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    setLoadAssignments(prev => prev.filter(a => a.classId !== id));
  };

  // Предметы
  const addSubject = (subject: Subject) => {
    setSubjects(prev => [...prev, subject]);
  };
  
  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };
  
  const deleteSubject = (id: string) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    setLoadAssignments(prev => prev.filter(a => a.subjectId !== id));
  };

  // Внеурочная деятельность
  const addExtracurricular = (extracurricular: Extracurricular) => {
    setExtracurriculars(prev => [...prev, extracurricular]);
  };
  
  const updateExtracurricular = (id: string, updates: Partial<Extracurricular>) => {
    setExtracurriculars(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };
  
  const deleteExtracurricular = (id: string) => {
    setExtracurriculars(prev => prev.filter(e => e.id !== id));
    setExtracurricularAssignments(prev => prev.filter(a => a.extracurricularId !== id));
  };

  // Распределение нагрузки
  const addLoadAssignment = (assignment: LoadAssignment) => {
    setLoadAssignments(prev => [...prev, assignment]);
  };
  
  const updateLoadAssignment = (id: string, updates: Partial<LoadAssignment>) => {
    setLoadAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };
  
  const deleteLoadAssignment = (id: string) => {
    setLoadAssignments(prev => prev.filter(a => a.id !== id));
  };

  // Распределение внеурочки
  const addExtracurricularAssignment = (assignment: ExtracurricularAssignment) => {
    setExtracurricularAssignments(prev => [...prev, assignment]);
  };
  
  const updateExtracurricularAssignment = (id: string, updates: Partial<ExtracurricularAssignment>) => {
    setExtracurricularAssignments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };
  
  const deleteExtracurricularAssignment = (id: string) => {
    setExtracurricularAssignments(prev => prev.filter(a => a.id !== id));
  };

  // Учебный план
  const setCurriculumHours = (subjectId: string, classId: string, hours: number) => {
    const key = `${subjectId}_${classId}`;
    setCurriculumPlan(prev => {
      if (hours === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: hours };
    });
  };

  const getCurriculumHours = (subjectId: string, classId: string): number => {
    const key = `${subjectId}_${classId}`;
    return curriculumPlan[key] || 0;
  };

  const clearCurriculumPlan = () => {
    setCurriculumPlan({});
  };

  // Импорт данных
  const importData = (data: Partial<{
    teachers: Teacher[];
    classes: SchoolClass[];
    subjects: Subject[];
    extracurriculars: Extracurricular[];
    curriculumPlan: CurriculumPlan;
  }>) => {
    if (data.teachers) setTeachers(prev => [...prev, ...data.teachers!]);
    if (data.classes) setClasses(prev => [...prev, ...data.classes!]);
    if (data.subjects) setSubjects(prev => [...prev, ...data.subjects!]);
    if (data.extracurriculars) setExtracurriculars(prev => [...prev, ...data.extracurriculars!]);
    if (data.curriculumPlan) setCurriculumPlan(prev => ({ ...prev, ...data.curriculumPlan! }));
  };

  // Очистка всех данных
  const clearAllData = () => {
    setTeachers([]);
    setClasses([]);
    setSubjects([]);
    setExtracurriculars([]);
    setLoadAssignments([]);
    setExtracurricularAssignments([]);
    setCurriculumPlan({});
  };

  const value: AppContextType = {
    teachers,
    classes,
    subjects,
    extracurriculars,
    loadAssignments,
    extracurricularAssignments,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    addClass,
    updateClass,
    deleteClass,
    addSubject,
    updateSubject,
    deleteSubject,
    addExtracurricular,
    updateExtracurricular,
    deleteExtracurricular,
    addLoadAssignment,
    updateLoadAssignment,
    deleteLoadAssignment,
    setLoadAssignments,
    addExtracurricularAssignment,
    updateExtracurricularAssignment,
    deleteExtracurricularAssignment,
    curriculumPlan,
    setCurriculumHours,
    getCurriculumHours,
    clearCurriculumPlan,
    importData,
    clearAllData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
