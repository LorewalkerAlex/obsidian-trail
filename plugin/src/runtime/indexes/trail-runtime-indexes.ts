import type { TrailTriageIssue } from "../../domain/trail-issue";
import type { TrailProject } from "../../domain/trail-project";

export function sortTrailTriageIssueIds(
  issuesById: Readonly<Record<string, TrailTriageIssue>>,
): readonly string[] {
  return Object.values(issuesById)
    .slice()
    .sort((left, right) => {
      if (left.due !== right.due) return left.due - right.due;
      return left.id.localeCompare(right.id);
    })
    .map((issue) => issue.id);
}

export function sortTrailProjectIds(
  projectsById: Readonly<Record<string, TrailProject>>,
): readonly string[] {
  return Object.values(projectsById)
    .slice()
    .sort((left, right) => {
      const title = left.title.localeCompare(right.title);
      return title !== 0 ? title : left.id.localeCompare(right.id);
    })
    .map((project) => project.id);
}
