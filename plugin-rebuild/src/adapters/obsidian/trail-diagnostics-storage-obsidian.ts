import type { TrailDiagnosticPersistence } from "../../diagnostics/trail-diagnostics";

export interface TrailDiagnosticFileAdapter {
  append(normalizedPath: string, data: string): Promise<void>;
  exists(normalizedPath: string): Promise<boolean>;
  mkdir(normalizedPath: string): Promise<void>;
  read(normalizedPath: string): Promise<string>;
  write(normalizedPath: string, data: string): Promise<void>;
}

export interface TrailDiagnosticStorage extends TrailDiagnosticPersistence {
  readonly evidencePath: string;
  writeValidationEvidence(content: string): Promise<void>;
}

interface PersistedDiagnosticLine {
  readonly sessionId?: unknown;
}

const MAX_RETAINED_SESSIONS = 2;
const MAX_EVENTS_PER_SESSION = 2_000;

function parseSessionId(line: string): string | undefined {
  try {
    const parsed = JSON.parse(line) as PersistedDiagnosticLine;
    return typeof parsed.sessionId === "string" ? parsed.sessionId : undefined;
  } catch {
    return undefined;
  }
}

function normalizedLines(text: string): readonly string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

function selectRecentSessions(text: string, maxSessions: number): string {
  if (maxSessions <= 0) return "";
  const lines = normalizedLines(text);
  const sessions: string[] = [];
  for (const line of lines) {
    const sessionId = parseSessionId(line);
    if (sessionId !== undefined && !sessions.includes(sessionId)) sessions.push(sessionId);
  }
  const keptLines: string[] = [];
  for (const sessionId of sessions.slice(-maxSessions)) {
    keptLines.push(...lines
      .filter((line) => parseSessionId(line) === sessionId)
      .slice(-MAX_EVENTS_PER_SESSION));
  }
  return keptLines.length === 0 ? "" : `${keptLines.join("\n")}\n`;
}

/** Hidden plugin-local storage for development traces and the latest validation evidence document. */
export function createObsidianDiagnosticStorage(
  adapter: TrailDiagnosticFileAdapter,
  directoryPath: string,
): TrailDiagnosticStorage {
  const tracePath = `${directoryPath}/trace.jsonl`;
  const evidencePath = `${directoryPath}/validation-evidence.json`;
  let directoryReady = false;

  const ensureDirectory = async (): Promise<void> => {
    if (directoryReady) return;
    if (!(await adapter.exists(directoryPath))) await adapter.mkdir(directoryPath);
    directoryReady = true;
  };

  return {
    evidencePath,
    async appendLine(line): Promise<void> {
      await ensureDirectory();
      if (!(await adapter.exists(tracePath))) {
        await adapter.write(tracePath, line);
        return;
      }
      await adapter.append(tracePath, line);
    },
    async beginSession(_sessionId): Promise<void> {
      await ensureDirectory();
      if (!(await adapter.exists(tracePath))) {
        await adapter.write(tracePath, "");
        return;
      }
      const existing = await adapter.read(tracePath);
      const retained = selectRecentSessions(existing, MAX_RETAINED_SESSIONS - 1);
      if (retained !== existing) await adapter.write(tracePath, retained);
    },
    async readRecentSessions(maxSessions): Promise<string> {
      await ensureDirectory();
      if (!(await adapter.exists(tracePath))) return "";
      return selectRecentSessions(await adapter.read(tracePath), maxSessions);
    },
    async replaceSession(sessionId, lines): Promise<void> {
      await ensureDirectory();
      const existing = await adapter.exists(tracePath) ? await adapter.read(tracePath) : "";
      const previousLines = normalizedLines(existing).filter(
        (line) => parseSessionId(line) !== sessionId,
      );
      const replacementLines = lines
        .map((line) => line.trim())
        .filter((line) => parseSessionId(line) === sessionId)
        .slice(-MAX_EVENTS_PER_SESSION);
      const combined = [...previousLines, ...replacementLines].join("\n");
      await adapter.write(
        tracePath,
        selectRecentSessions(combined === "" ? "" : `${combined}\n`, MAX_RETAINED_SESSIONS),
      );
    },
    async writeValidationEvidence(content): Promise<void> {
      await ensureDirectory();
      await adapter.write(evidencePath, content);
    },
  };
}
