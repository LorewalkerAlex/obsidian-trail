import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TrailArea,
  type TrailParseIssue,
  type TrailParseResult,
  type TrailProject,
  type TrailProjectStatus,
  type TrailTask,
  type TrailTaskPriority,
  type TrailTaskStatus,
} from "./trail-model";

export interface TrailMarkdownInput {
  filePath: string;
  markdown: string;
  frontmatter?: Record<string, unknown>;
}

export interface TrailAreaParseInput extends TrailMarkdownInput {
  areaName: string;
}

export interface TrailProjectParseInput extends TrailMarkdownInput {
  area: TrailArea;
  projectName: string;
}

interface SectionRange {
  start: number;
  end: number;
}

interface TaskMetadata {
  id: string;
  status: TrailTaskStatus;
  priority: TrailTaskPriority;
  created: string;
  due?: string;
  completed?: string;
  labels: string[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;
const TASK_LINE_PATTERN =
  /^- \[([ xX])\] (.+?)\s*<!--\s*trail:task\s+(.+?)\s*-->\s*$/;

export function parseArea(
  input: TrailAreaParseInput,
): TrailParseResult<TrailArea> {
  const issues: TrailParseIssue[] = [];
  const id = requiredUuid(input, "id", issues);
  const created = requiredDate(input, "created", issues);

  if (!id || !created) {
    return { issues };
  }

  return {
    value: {
      id,
      name: input.areaName,
      created,
      description: stripFrontmatter(input.markdown).trim(),
      filePath: input.filePath,
    },
    issues,
  };
}

export function parseProject(
  input: TrailProjectParseInput,
): TrailParseResult<TrailProject> {
  const issues: TrailParseIssue[] = [];
  const id = requiredUuid(input, "id", issues);
  const created = requiredDate(input, "created", issues);
  const status = projectStatus(input, issues);
  const sections = projectSections(input, issues);

  if (!id || !created || !status || !sections) {
    return { issues };
  }

  const taskResult = parseTasks(input, id, sections.Tasks);
  const notes = parseProjectNotes(input, sections.Notes, issues);
  issues.push(...taskResult.issues);

  if (issues.some((issue) => issue.scope === "file")) {
    return { issues };
  }

  return {
    value: {
      id,
      areaId: input.area.id,
      areaName: input.area.name,
      name: input.projectName,
      created,
      status,
      overview: input.markdown
        .slice(sections.Overview.start, sections.Overview.end)
        .trim(),
      tasks: taskResult.tasks,
      notes,
      filePath: input.filePath,
    },
    issues,
  };
}

export function parseProjectTasks(
  input: TrailMarkdownInput,
  projectId: string,
): { tasks: TrailTask[]; issues: TrailParseIssue[] } {
  const issues: TrailParseIssue[] = [];
  const sections = projectSections(input, issues);

  if (!sections) {
    return { tasks: [], issues };
  }

  const result = parseTasks(input, projectId, sections.Tasks);

  parseProjectNotes(input, sections.Notes, issues);

  return {
    tasks: result.tasks,
    issues: [...issues, ...result.issues],
  };
}

function parseTasks(
  input: TrailMarkdownInput,
  projectId: string,
  section: SectionRange,
): { tasks: TrailTask[]; issues: TrailParseIssue[] } {
  const sectionText = input.markdown.slice(section.start, section.end);
  const headers = [...sectionText.matchAll(/^- \[[ xX]\] .*$/gm)];
  const tasks: TrailTask[] = [];
  const issues: TrailParseIssue[] = [];
  const ids = new Set<string>();

  headers.forEach((header, index) => {
    const startOffset = section.start + header.index;
    const endOffset = section.start
      + (headers[index + 1]?.index ?? sectionText.length);
    const line = lineNumber(input.markdown, startOffset);
    const result = parseTask(
      input,
      projectId,
      header[0].replace(/\r$/, ""),
      input.markdown.slice(startOffset, endOffset),
      startOffset,
      endOffset,
      line,
    );

    issues.push(...result.issues);

    if (!result.task) {
      return;
    }

    if (ids.has(result.task.id)) {
      issues.push(taskIssue(
        input.filePath,
        line,
        "task.id.duplicate",
        `Duplicate task id: ${result.task.id}.`,
        result.task.id,
      ));
      return;
    }

    ids.add(result.task.id);
    tasks.push(result.task);
  });

  return { tasks, issues };
}

function parseTask(
  input: TrailMarkdownInput,
  projectId: string,
  header: string,
  block: string,
  startOffset: number,
  endOffset: number,
  line: number,
): { task?: TrailTask; issues: TrailParseIssue[] } {
  const match = TASK_LINE_PATTERN.exec(header);
  const commentCount = header.match(/<!--\s*trail:task\b/g)?.length ?? 0;

  if (!match || commentCount !== 1) {
    return {
      issues: [taskIssue(
        input.filePath,
        line,
        "task.syntax.invalid",
        "Task must contain one valid trail:task comment on its title line.",
      )],
    };
  }

  const metadata = taskMetadata(match[3]);
  if (!metadata) {
    return {
      issues: [taskIssue(
        input.filePath,
        line,
        "task.metadata.invalid",
        "trail:task metadata contains invalid JSON or fields.",
      )],
    };
  }

  const title = match[2].trim();
  const childLines = block.split(/\r?\n/).slice(1);
  const subtasks = childLines.flatMap((child) => {
    const subtask = /^ {2}- \[([ xX])\] (.+)$/.exec(child);
    return subtask
      ? [{
          text: subtask[2].trim(),
          completed: subtask[1].toLowerCase() === "x",
        }]
      : [];
  });
  const notes = childLines.flatMap((child) => {
    const note = /^ {2}- (?!\[[ xX]\] )(.+)$/.exec(child);
    return note ? [{ text: note[1].trim() }] : [];
  });
  const checked = match[1].toLowerCase() === "x";
  const completed = metadata.status === "completed";

  if (
    !title
    || checked !== completed
    || (completed && !metadata.completed)
    || (!completed && metadata.completed)
    || (completed && subtasks.some((subtask) => !subtask.completed))
  ) {
    return {
      issues: [taskIssue(
        input.filePath,
        line,
        "task.completion.invalid",
        "Task title or completion fields are inconsistent.",
        metadata.id,
      )],
    };
  }

  return {
    task: {
      ...metadata,
      projectId,
      projectPath: input.filePath,
      title,
      subtasks,
      notes,
      source: {
        filePath: input.filePath,
        startOffset,
        endOffset,
        fingerprint: block,
      },
    },
    issues: [],
  };
}

function taskMetadata(json: string): TaskMetadata | undefined {
  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const labels = value.labels ?? [];
  if (
    typeof value.id !== "string"
    || !UUID_PATTERN.test(value.id)
    || !isOneOf(value.status, TASK_STATUSES)
    || !isOneOf(value.priority, TASK_PRIORITIES)
    || typeof value.created !== "string"
    || !TIMESTAMP_PATTERN.test(value.created)
    || (value.due !== undefined
      && (typeof value.due !== "string"
        || !DATE_PATTERN.test(value.due)))
    || (value.completed !== undefined
      && (typeof value.completed !== "string"
        || !TIMESTAMP_PATTERN.test(value.completed)))
    || !Array.isArray(labels)
    || !labels.every(
      (label: unknown): label is string => typeof label === "string",
    )
  ) {
    return undefined;
  }

  return {
    id: value.id,
    status: value.status,
    priority: value.priority,
    created: value.created,
    due: value.due,
    completed: value.completed,
    labels,
  };
}

function parseProjectNotes(
  input: TrailMarkdownInput,
  section: SectionRange,
  issues: TrailParseIssue[],
): { text: string }[] {
  const notes: { text: string }[] = [];
  const lines = input.markdown
    .slice(section.start, section.end)
    .split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/^- \[[ xX]\] /.test(line)) {
      issues.push(fileIssue(
        input.filePath,
        "project.notes.checkbox",
        "Project Notes must not contain a top-level checkbox.",
        lineNumber(input.markdown, section.start) + index,
      ));
      return;
    }

    const note = /^- (?!\[[ xX]\] )(.+)$/.exec(line);
    if (note) {
      notes.push({ text: note[1].trim() });
    }
  });

  return notes;
}

function projectSections(
  input: TrailMarkdownInput,
  issues: TrailParseIssue[],
): Record<"Overview" | "Tasks" | "Notes", SectionRange> | undefined {
  const expected = ["Overview", "Tasks", "Notes"] as const;
  const headings = [...input.markdown.matchAll(
    /^##[ \t]+(.+?)[ \t]*\r?$/gm,
  )];

  if (
    headings.length !== expected.length
    || headings.some(
      (heading, index) => heading[1].trim() !== expected[index],
    )
  ) {
    issues.push(fileIssue(
      input.filePath,
      "project.sections.invalid",
      "Project must contain only Overview, Tasks, and Notes once and in order.",
    ));
    return undefined;
  }

  return Object.fromEntries(headings.map((heading, index) => {
    const headingEnd = heading.index + heading[0].length;
    return [heading[1].trim(), {
      start: skipLineBreak(input.markdown, headingEnd),
      end: headings[index + 1]?.index ?? input.markdown.length,
    }];
  })) as Record<"Overview" | "Tasks" | "Notes", SectionRange>;
}

function requiredUuid(
  input: TrailMarkdownInput,
  key: string,
  issues: TrailParseIssue[],
): string | undefined {
  const value = input.frontmatter?.[key];
  if (typeof value === "string" && UUID_PATTERN.test(value)) {
    return value;
  }
  issues.push(fileIssue(input.filePath, `${key}.invalid`, `${key} must be a UUID.`));
  return undefined;
}

function requiredDate(
  input: TrailMarkdownInput,
  key: string,
  issues: TrailParseIssue[],
): string | undefined {
  const value = input.frontmatter?.[key];
  if (typeof value === "string" && DATE_PATTERN.test(value)) {
    return value;
  }
  issues.push(fileIssue(
    input.filePath,
    `${key}.invalid`,
    `${key} must use YYYY-MM-DD.`,
  ));
  return undefined;
}

function projectStatus(
  input: TrailProjectParseInput,
  issues: TrailParseIssue[],
): TrailProjectStatus | undefined {
  const value = input.frontmatter?.status;
  if (isOneOf(value, PROJECT_STATUSES)) {
    return value;
  }
  issues.push(fileIssue(
    input.filePath,
    "project.status.invalid",
    "Project status is invalid.",
  ));
  return undefined;
}

function stripFrontmatter(markdown: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(markdown);
  return match ? markdown.slice(match[0].length) : markdown;
}

function skipLineBreak(markdown: string, offset: number): number {
  if (markdown.startsWith("\r\n", offset)) {
    return offset + 2;
  }
  return markdown[offset] === "\n" ? offset + 1 : offset;
}

function lineNumber(markdown: string, offset: number): number {
  return markdown.slice(0, offset).split("\n").length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function fileIssue(
  filePath: string,
  code: string,
  message: string,
  line?: number,
): TrailParseIssue {
  return { scope: "file", code, message, filePath, line };
}

function taskIssue(
  filePath: string,
  line: number,
  code: string,
  message: string,
  objectId?: string,
): TrailParseIssue {
  return { scope: "task", code, message, filePath, line, objectId };
}
