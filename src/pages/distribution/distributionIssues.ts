import { useMemo } from "react";
import type { LoadAssignment } from "@/types";

export type DistributionIssueType = "duplicate" | "coverage";

export interface DistributionIssue {
  id: string;
  type: DistributionIssueType;
  severity: "warning";
  title: string;
  description: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
}

export function getDuplicateAssignmentIssues(params: {
  loadAssignments: LoadAssignment[];
}): DistributionIssue[] {
  const { loadAssignments } = params;

  const byKey = new Map<string, LoadAssignment[]>();
  for (const a of loadAssignments) {
    const key = `${a.classId}__${a.subjectId}`;
    const list = byKey.get(key) ?? [];
    list.push(a);
    byKey.set(key, list);
  }

  const issues: DistributionIssue[] = [];

  for (const [key, list] of byKey.entries()) {
    const nonGroup = list.filter((a) => !a.isGroup);
    const distinctTeachers = new Set(nonGroup.map((a) => a.teacherId));

    // Дубль: один класс+предмет назначен двум разным учителям без деления на группы
    if (distinctTeachers.size >= 2) {
      const [classId, subjectId] = key.split("__");
      issues.push({
        id: `dup_${key}`,
        type: "duplicate",
        severity: "warning",
        title: "Дубли назначения",
        description:
          "Один и тот же класс и предмет назначены нескольким учителям без деления на группы.",
        classId,
        subjectId,
      });
    }
  }

  return issues;
}

export function getCoverageIssues(params: {
  classes: { id: string }[];
  subjects: { id: string }[];
  loadAssignments: LoadAssignment[];
  getRequiredHours: (subjectId: string, classId: string) => number;
}): DistributionIssue[] {
  const { classes, subjects, loadAssignments, getRequiredHours } = params;

  const byKey = new Map<string, number>();
  for (const a of loadAssignments) {
    const key = `${a.classId}__${a.subjectId}`;
    byKey.set(key, (byKey.get(key) ?? 0) + a.hoursPerWeek);
  }

  const issues: DistributionIssue[] = [];

  for (const cls of classes) {
    for (const subj of subjects) {
      const required = getRequiredHours(subj.id, cls.id);
      if (required <= 0) continue;

      const key = `${cls.id}__${subj.id}`;
      const assigned = byKey.get(key) ?? 0;

      if (assigned !== required) {
        issues.push({
          id: `cov_${key}`,
          type: "coverage",
          severity: "warning",
          title: assigned < required ? "Недобор часов" : "Перебор часов",
          description:
            assigned < required
              ? `Не хватает ${required - assigned} ч. (назначено ${assigned} из ${required}).`
              : `Лишних ${assigned - required} ч. (назначено ${assigned} при норме ${required}).`,
          classId: cls.id,
          subjectId: subj.id,
        });
      }
    }
  }

  return issues;
}

export function useDistributionIssues(params: {
  classes: { id: string }[];
  subjects: { id: string }[];
  loadAssignments: LoadAssignment[];
  getRequiredHours: (subjectId: string, classId: string) => number;
}) {
  const { classes, subjects, loadAssignments, getRequiredHours } = params;

  return useMemo(() => {
    return [
      ...getDuplicateAssignmentIssues({ loadAssignments }),
      ...getCoverageIssues({ classes, subjects, loadAssignments, getRequiredHours }),
    ];
  }, [classes, subjects, loadAssignments, getRequiredHours]);
}
