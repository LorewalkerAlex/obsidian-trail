import { describe, expect, it, vi } from "vitest";

import type { TrailTriageIssue, TrailWorkflowIssue } from "../domain/trail-issue";
import { formatLocalDateTimeInTimeZone } from "../domain/trail-temporal";
import { setTrailRuntimeControl } from "../runtime/control/trail-runtime-control";
import {
  createTrailRuntimeStore,
  setSourceIssuesForPath,
} from "../runtime/store/trail-runtime-store";
import {
  createTrailApplicationSessionRegistry,
  type TrailApplicationSession,
} from "./trail-application-session";
import { TrailApplication } from "./trail-application";

const TRIAGE_PATH = "Trail/Collections/Triage.md";
const PROJECTS_PATH = "Trail/Projects";

function receipt(issueId: string) {
  return { completion: Promise.resolve(), issueId };
}

function createSession(timezone = "Asia/Shanghai"): {
  readonly session: TrailApplicationSession;
  readonly calls: {
    readonly edit: ReturnType<typeof vi.fn>;
    readonly defer: ReturnType<typeof vi.fn>;
    readonly projectCreate: ReturnType<typeof vi.fn>;
  };
} {
  const edit = vi.fn((input: { expectedIssue: TrailTriageIssue }) =>
    receipt(input.expectedIssue.id));
  const defer = vi.fn((input: { expectedIssue: TrailTriageIssue }) =>
    receipt(input.expectedIssue.id));
  const projectCreate = vi.fn((title: string) => ({
    completion: Promise.resolve(),
    entityId: `project:${title}`,
  }));

  return {
    calls: { defer, edit, projectCreate },
    session: {
      accept: {
        accept: (expectedIssue, projectId) => ({
          completion: Promise.resolve(),
          sourceIssueId: expectedIssue.id,
          targetIssueId: `${projectId}:accepted`,
        }),
      },
      intake: {
        capture: ({ title }) => ({
          completion: Promise.resolve(),
          issue: {
            context: "triage",
            due: 100,
            id: `capture:${title}`,
            labelIds: [],
            title,
          },
        }),
      },
      issues: {
        changeStatus: (expectedIssue) => ({
          completion: Promise.resolve(),
          entityId: expectedIssue.id,
        }),
        create: (projectId, title) => ({
          completion: Promise.resolve(),
          entityId: `${projectId}:${title}`,
        }),
      },
      management: {
        defer,
        delete: (expectedIssue) => receipt(expectedIssue.id),
        edit,
      },
      projects: { create: projectCreate },
      timezone,
    },
  };
}

function createReadyApplication(timezone = "Asia/Shanghai") {
  const runtimeStore = createTrailRuntimeStore();
  const registry = createTrailApplicationSessionRegistry();
  const built = createSession(timezone);
  registry.replace(built.session);
  setTrailRuntimeControl(runtimeStore, { kind: "ready", timezone });
  return {
    application: new TrailApplication({ runtimeStore, session: registry }),
    calls: built.calls,
    registry,
    runtimeStore,
  };
}

const triageIssue: TrailTriageIssue = {
  context: "triage",
  due: Date.UTC(2026, 7, 13, 2, 30, 45, 900),
  id: "issue-a",
  labelIds: [],
  title: "Original",
};

const workflowIssue: TrailWorkflowIssue = {
  context: "workflow",
  createdAt: 1,
  id: "workflow-a",
  labelIds: [],
  projectId: "project-a",
  statusDefinitionId: "status-a",
  title: "Workflow",
};

describe("Trail Application facade", () => {
  it("rejects UI actions while Runtime is not ready even when a session exists", () => {
    const { application, runtimeStore } = createReadyApplication();
    setTrailRuntimeControl(runtimeStore, { kind: "refreshing", timezone: "Asia/Shanghai" });

    expect(() => application.capture("Blocked")).toThrow(
      "Trail is not ready for Quick Capture",
    );
    expect(() => application.changeWorkflowIssueStatus(workflowIssue, "status-b")).toThrow(
      "Trail is not ready for Workflow actions",
    );
  });

  it("blocks Triage actions when the canonical Triage source has Data Issues", () => {
    const { application, runtimeStore } = createReadyApplication();
    setSourceIssuesForPath(runtimeStore, TRIAGE_PATH, [{
      code: "test-invalid",
      filePath: TRIAGE_PATH,
      message: "invalid fixture",
      scope: "file",
    }]);

    expect(() => application.capture("Blocked capture")).toThrow(
      "Quick Capture is paused until Triage.md is valid again",
    );
  });

  it("preserves the exact Due when title-only edit submits the formatted current value", () => {
    const { application, calls } = createReadyApplication();
    const currentDue = formatLocalDateTimeInTimeZone(
      triageIssue.due,
      "Asia/Shanghai",
    );

    application.editTriageIssue(triageIssue, "Edited", currentDue);

    expect(calls.edit).toHaveBeenCalledWith(expect.objectContaining({
      due: triageIssue.due,
      expectedIssue: triageIssue,
      title: "Edited",
    }));
  });

  it("maps changed Due and Defer through the validated session timezone", () => {
    const { application, calls } = createReadyApplication();

    application.editTriageIssue(triageIssue, "Original", "2026-08-14T10:30");
    application.deferTriageIssue(triageIssue);

    expect(calls.edit).toHaveBeenCalledWith(expect.objectContaining({
      due: Date.UTC(2026, 7, 14, 2, 30),
    }));
    expect(calls.defer).toHaveBeenCalledWith(expect.objectContaining({
      due: Date.UTC(2026, 7, 20, 2, 30, 45, 900),
    }));
  });

  it("blocks Workflow actions when the Projects root is invalid", () => {
    const { application, calls, runtimeStore } = createReadyApplication();
    setSourceIssuesForPath(runtimeStore, PROJECTS_PATH, [{
      code: "test-projects-invalid",
      filePath: PROJECTS_PATH,
      message: "invalid Projects root",
      scope: "file",
    }]);

    expect(() => application.createProject("Blocked")).toThrow(
      "Workflow actions are paused until the Projects source is valid again",
    );
    expect(calls.projectCreate).not.toHaveBeenCalled();
  });

  it("reads the replacement session after a successful Runtime reload", () => {
    const { application, registry } = createReadyApplication();
    const replacement = createSession("Asia/Singapore");
    registry.replace(replacement.session);

    application.createProject("Replacement");

    expect(replacement.calls.projectCreate).toHaveBeenCalledWith("Replacement");
  });
});