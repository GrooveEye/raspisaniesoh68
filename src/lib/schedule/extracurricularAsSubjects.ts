import type { Extracurricular, ExtracurricularAssignment, LoadAssignment, SchoolClass, Subject } from "@/types";

export const EXTRACURRICULAR_SUBJECT_PREFIX = "extr_";

export function extracurricularToSubject(ex: Extracurricular): Subject {
  return {
    id: `${EXTRACURRICULAR_SUBJECT_PREFIX}${ex.id}`,
    name: `Внеурочная деятельность: ${ex.name}`,
    area: "Внеурочная деятельность",
    requiresGroupSplit: false,
  };
}

export function buildExtracurricularSubjects(extracurriculars: Extracurricular[]): Subject[] {
  return extracurriculars.map(extracurricularToSubject);
}

export type ExtracurricularHoursByAssignment = Record<string, Record<string, number>>;

/**
 * Преобразует ручное распределение часов внеурочки в обычные LoadAssignment,
 * чтобы алгоритм расписания мог работать «как с предметами».
 */
export function buildExtracurricularLoadAssignments(params: {
  extracurricularAssignments: ExtracurricularAssignment[];
  classes: SchoolClass[];
  hoursByAssignment: ExtracurricularHoursByAssignment;
}): LoadAssignment[] {
  const { extracurricularAssignments, hoursByAssignment } = params;

  const result: LoadAssignment[] = [];

  for (const a of extracurricularAssignments) {
    const byClass = hoursByAssignment[a.id] || {};

    for (const [classId, hours] of Object.entries(byClass)) {
      const h = Number(hours) || 0;
      if (h <= 0) continue;

      result.push({
        id: `extr_sched__${a.id}__${classId}`,
        teacherId: a.teacherId,
        subjectId: `${EXTRACURRICULAR_SUBJECT_PREFIX}${a.extracurricularId}`,
        classId,
        hoursPerWeek: h,
      });
    }
  }

  return result;
}

export function isExtracurricularSubjectId(subjectId: string) {
  return subjectId.startsWith(EXTRACURRICULAR_SUBJECT_PREFIX);
}
