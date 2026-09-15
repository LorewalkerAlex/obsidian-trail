import type { TrailWorkflowIssue } from "../../domain/model/trail-entities";
import { resolveTrailStatusDefinition } from "../../domain/rules/trail-status-rules";
import {
  addTrailCalendarDays,
  readTrailZonedDateTimeParts,
  resolveTrailZonedDateTimeParts,
} from "../../domain/rules/trail-temporal-rules";
import type { TrailRuntimeState } from "../../runtime/store/trail-runtime-store";
import {
  compareTrailProjectOrder,
  createTrailProjectSummaryReadModel,
  requireTrailProjectStatus,
  selectTrailWorkflowIssuesForProject,
} from "../projects/trail-project-collection-query";
import { selectTrailReadableRuntimeSnapshot } from "../shared/trail-effective-query";
import {
  selectTrailWorkflowIssueProgress,
  type TrailProgressReadModel,
} from "../shared/trail-progress-query";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface TrailHomeLocalDay {
  readonly cutoff: number;
  readonly dayOfMonth: number;
  readonly id: string;
  readonly label: string;
  readonly month: number;
  readonly start: number;
  readonly weekday: string;
  readonly weekdayIndex: number;
  readonly year: number;
}

export interface TrailHomeThisWeekDayReadModel {
  readonly dayOfMonth: number;
  readonly id: string;
  readonly isToday: boolean;
  readonly issueDueCount: number;
  readonly triageDueCount: number;
  readonly weekday: string;
}

export interface TrailHomeLifecycleDayReadModel {
  readonly createdCount: number;
  readonly dateLabel: string;
  readonly id: string;
  readonly startedCount: number;
  readonly terminalCount: number;
  readonly weekIndex: number;
  readonly weekdayIndex: number;
}

export interface TrailHomeLifecycleMonthReadModel {
  readonly label: string;
  readonly weekIndex: number;
}

export interface TrailHomeWorkTrendDayReadModel {
  readonly activeStock: number;
  readonly backlogStock: number;
  readonly completed7dCount: number;
  readonly dateLabel: string;
  readonly id: string;
}

export interface TrailHomeWorkPulseProjectReadModel {
  readonly id: string;
  readonly progress: TrailProgressReadModel;
  readonly title: string;
}

export interface TrailHomeReadModel {
  readonly lifecycle: {
    readonly days: readonly TrailHomeLifecycleDayReadModel[];
    readonly months: readonly TrailHomeLifecycleMonthReadModel[];
  };
  readonly thisWeek: {
    readonly days: readonly TrailHomeThisWeekDayReadModel[];
    readonly monthLabel: string;
  };
  readonly workPulse: {
    readonly currentCycle?: {
      readonly id: string;
      readonly plannedEnd: number;
      readonly progress: TrailProgressReadModel;
      readonly startedAt: number;
    };
    readonly inProgressProjects: readonly TrailHomeWorkPulseProjectReadModel[];
    readonly timezone: string;
    readonly triage: {
      readonly activeCount: number;
      readonly overdueCount: number;
      readonly remainCount: number;
    };
  };
  readonly workTrend: {
    readonly days: readonly TrailHomeWorkTrendDayReadModel[];
    readonly hasHistory: boolean;
    readonly rangeLabel: string;
  };
}

function localDateId(timestamp: number, timezone: string): string {
  const parts = readTrailZonedDateTimeParts(timestamp, timezone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function localWeekdayIndex(year: number, month: number, day: number): number {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

function localDayStart(timestamp: number, timezone: string): number {
  const parts = readTrailZonedDateTimeParts(timestamp, timezone);
  return resolveTrailZonedDateTimeParts({
    day: parts.day,
    hour: 0,
    millisecond: 0,
    minute: 0,
    month: parts.month,
    second: 0,
    year: parts.year,
  }, timezone);
}

function threeCalendarMonthStart(now: number, timezone: string): number {
  const parts = readTrailZonedDateTimeParts(now, timezone);
  const normalized = new Date(Date.UTC(parts.year, parts.month - 3, 1));
  return resolveTrailZonedDateTimeParts({
    day: 1,
    hour: 0,
    millisecond: 0,
    minute: 0,
    month: normalized.getUTCMonth() + 1,
    second: 0,
    year: normalized.getUTCFullYear(),
  }, timezone);
}

function buildLocalDay(
  start: number,
  timezone: string,
  todayId: string,
  now: number,
): TrailHomeLocalDay {
  const parts = readTrailZonedDateTimeParts(start, timezone);
  const id = localDateId(start, timezone);
  const weekdayIndex = localWeekdayIndex(parts.year, parts.month, parts.day);
  const nextStart = addTrailCalendarDays(start, timezone, 1);
  const cutoff = id === todayId ? now : nextStart - 1;

  return {
    cutoff,
    dayOfMonth: parts.day,
    id,
    label: `${MONTH_LABELS[parts.month - 1]} ${parts.day}, ${parts.year}`,
    month: parts.month,
    start,
    weekday: WEEKDAY_LABELS[(weekdayIndex + 1) % 7],
    weekdayIndex,
    year: parts.year,
  };
}

function buildLocalDays(
  firstStart: number,
  lastStart: number,
  timezone: string,
  todayId: string,
  now: number,
): readonly TrailHomeLocalDay[] {
  const days: TrailHomeLocalDay[] = [];
  for (
    let start = firstStart;
    start <= lastStart;
    start = addTrailCalendarDays(start, timezone, 1)
  ) {
    days.push(buildLocalDay(start, timezone, todayId, now));
  }
  return days;
}

function monthRangeLabel(
  first: TrailHomeLocalDay,
  last: TrailHomeLocalDay,
): string {
  const firstLabel = MONTH_LABELS[first.month - 1];
  const lastLabel = MONTH_LABELS[last.month - 1];
  return first.month === last.month && first.year === last.year
    ? firstLabel
    : `${firstLabel}–${lastLabel}`;
}

function incrementCount(map: Map<string, number>, id: string): void {
  map.set(id, (map.get(id) ?? 0) + 1);
}

/**
 * Home is a disposable projection of current Runtime facts. It acquires one
 * readable snapshot for the complete surface and persists no history or score.
 */
export function selectTrailHomeReadModel(
  state: TrailRuntimeState,
  now: number,
): TrailHomeReadModel | null {
  const readable = selectTrailReadableRuntimeSnapshot(state);
  const configuration = readable.authoritative.configuration;
  if (configuration === null) return null;

  const timezone = configuration.temporal.timezone;
  const todayStart = localDayStart(now, timezone);
  const todayId = localDateId(todayStart, timezone);
  const today = buildLocalDay(todayStart, timezone, todayId, now);
  const horizonStart = threeCalendarMonthStart(now, timezone);
  const horizonDays = buildLocalDays(
    horizonStart,
    todayStart,
    timezone,
    todayId,
    now,
  );
  const firstHorizonDay = horizonDays[0];
  const lastHorizonDay = horizonDays[horizonDays.length - 1];
  if (firstHorizonDay === undefined || lastHorizonDay === undefined) {
    throw new Error("Home temporal horizon must contain at least one day");
  }

  const workflowIssues = [...readable.authoritative.domain.issuesById.values()]
    .filter((issue): issue is TrailWorkflowIssue => issue.context === "workflow");

  const triageIssues = [...readable.authoritative.domain.issuesById.values()]
    .filter((issue) => issue.context === "triage");
  const triageOverdueCount = triageIssues.reduce(
    (count, issue) => issue.due < todayStart ? count + 1 : count,
    0,
  );

  let currentCycle: TrailHomeReadModel["workPulse"]["currentCycle"];
  const currentCycleId = readable.indexes.currentCycleId;
  if (currentCycleId !== undefined) {
    const cycle = readable.authoritative.domain.cyclesById.get(currentCycleId);
    if (cycle === undefined || cycle.endedAt !== undefined) return null;
    const issues: TrailWorkflowIssue[] = [];
    for (const issueId of cycle.issueIds) {
      const issue = readable.authoritative.domain.issuesById.get(issueId);
      if (issue?.context !== "workflow") return null;
      issues.push(issue);
    }
    const progress = selectTrailWorkflowIssueProgress(configuration, issues);
    if (progress === null) return null;
    currentCycle = {
      id: cycle.id,
      plannedEnd: cycle.plannedEnd,
      progress,
      startedAt: cycle.startedAt,
    };
  }

  const inProgressProjects = [...readable.authoritative.domain.projectsById.values()]
    .filter((project) => (
      requireTrailProjectStatus(configuration, project).category === "started"
    ))
    .sort((left, right) => compareTrailProjectOrder(configuration, left, right))
    .map((project) => {
      const status = requireTrailProjectStatus(configuration, project);
      const summary = createTrailProjectSummaryReadModel(
        project,
        status,
        selectTrailWorkflowIssuesForProject(readable, configuration, project.id),
      );
      return {
        id: summary.id,
        progress: summary.progress,
        title: summary.title,
      };
    });

  const triageDueByDay = new Map<string, number>();
  const workflowDueByDay = new Map<string, number>();
  for (const issue of readable.authoritative.domain.issuesById.values()) {
    if (issue.context === "triage") {
      incrementCount(triageDueByDay, localDateId(issue.due, timezone));
    } else if (issue.due !== undefined) {
      incrementCount(workflowDueByDay, localDateId(issue.due, timezone));
    }
  }

  const weekStart = addTrailCalendarDays(todayStart, timezone, -today.weekdayIndex);
  const weekDays = buildLocalDays(
    weekStart,
    addTrailCalendarDays(weekStart, timezone, 6),
    timezone,
    todayId,
    now,
  );
  const firstWeekDay = weekDays[0];
  const lastWeekDay = weekDays[weekDays.length - 1];
  if (firstWeekDay === undefined || lastWeekDay === undefined) {
    throw new Error("Home current week must contain seven days");
  }

  const lifecycleCounts = new Map<
    string,
    { createdCount: number; startedCount: number; terminalCount: number }
  >();
  const readLifecycleCounts = (id: string) => {
    const existing = lifecycleCounts.get(id);
    if (existing !== undefined) return existing;
    const created = { createdCount: 0, startedCount: 0, terminalCount: 0 };
    lifecycleCounts.set(id, created);
    return created;
  };
  for (const issue of workflowIssues) {
    if (issue.createdAt >= horizonStart && issue.createdAt <= now) {
      readLifecycleCounts(localDateId(issue.createdAt, timezone)).createdCount += 1;
    }
    if (
      issue.firstStartedAt !== undefined
      && issue.firstStartedAt >= horizonStart
      && issue.firstStartedAt <= now
    ) {
      readLifecycleCounts(localDateId(issue.firstStartedAt, timezone)).startedCount += 1;
    }
    if (
      issue.terminalAt !== undefined
      && issue.terminalAt >= horizonStart
      && issue.terminalAt <= now
    ) {
      readLifecycleCounts(localDateId(issue.terminalAt, timezone)).terminalCount += 1;
    }
  }

  const firstWeekdayIndex = firstHorizonDay.weekdayIndex;
  const lifecycleDays = horizonDays.map((day, index) => {
    const counts = lifecycleCounts.get(day.id) ?? {
      createdCount: 0,
      startedCount: 0,
      terminalCount: 0,
    };
    return {
      ...counts,
      dateLabel: day.label,
      id: day.id,
      weekIndex: Math.floor((firstWeekdayIndex + index) / 7),
      weekdayIndex: day.weekdayIndex,
    };
  });
  const lifecycleMonths: TrailHomeLifecycleMonthReadModel[] = [];
  let previousMonthKey = "";
  horizonDays.forEach((day, index) => {
    const monthKey = `${day.year}-${day.month}`;
    if (monthKey === previousMonthKey) return;
    lifecycleMonths.push({
      label: MONTH_LABELS[day.month - 1],
      weekIndex: Math.floor((firstWeekdayIndex + index) / 7),
    });
    previousMonthKey = monthKey;
  });

  const completedIssues = workflowIssues.filter((issue) => (
    resolveTrailStatusDefinition(
      configuration,
      "issue",
      issue.statusDefinitionId,
    )?.category === "completed"
  ));
  const workTrendDays = horizonDays.map((day) => {
    let backlogStock = 0;
    let activeStock = 0;
    for (const issue of workflowIssues) {
      if (
        issue.createdAt <= day.cutoff
        && (issue.firstStartedAt === undefined || issue.firstStartedAt > day.cutoff)
        && (issue.terminalAt === undefined || issue.terminalAt > day.cutoff)
      ) {
        backlogStock += 1;
      }
      if (
        issue.firstStartedAt !== undefined
        && issue.firstStartedAt <= day.cutoff
        && (issue.terminalAt === undefined || issue.terminalAt > day.cutoff)
      ) {
        activeStock += 1;
      }
    }

    const completedWindowStart = addTrailCalendarDays(day.start, timezone, -6);
    const completed7dCount = completedIssues.reduce((count, issue) => (
      issue.terminalAt !== undefined
      && issue.terminalAt >= completedWindowStart
      && issue.terminalAt <= day.cutoff
        ? count + 1
        : count
    ), 0);

    return {
      activeStock,
      backlogStock,
      completed7dCount,
      dateLabel: day.label,
      id: day.id,
    };
  });

  return {
    lifecycle: {
      days: lifecycleDays,
      months: lifecycleMonths,
    },
    thisWeek: {
      days: weekDays.map((day) => ({
        dayOfMonth: day.dayOfMonth,
        id: day.id,
        isToday: day.id === todayId,
        issueDueCount: workflowDueByDay.get(day.id) ?? 0,
        triageDueCount: triageDueByDay.get(day.id) ?? 0,
        weekday: day.weekday,
      })),
      monthLabel: monthRangeLabel(firstWeekDay, lastWeekDay),
    },
    workPulse: {
      currentCycle,
      inProgressProjects,
      timezone,
      triage: {
        activeCount: triageIssues.length,
        overdueCount: triageOverdueCount,
        remainCount: triageIssues.length - triageOverdueCount,
      },
    },
    workTrend: {
      days: workTrendDays,
      hasHistory: workflowIssues.some((issue) => issue.createdAt <= now),
      rangeLabel: monthRangeLabel(firstHorizonDay, lastHorizonDay),
    },
  };
}
