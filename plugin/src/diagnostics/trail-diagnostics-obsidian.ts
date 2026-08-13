import type { TrailDiagnosticPersistence } from "./trail-diagnostics";

export interface TrailDiagnosticAdapter {
  append(normalizedPath: string, data: string): Promise<void>;
  exists(normalizedPath: string): Promise<boolean>;
  mkdir(normalizedPath: string): Promise<void>;
  read(normalizedPath: string): Promise<string>;
  write(normalizedPath: string, data: string): Promise<void>;
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

function selectRecentSessions(
  text: string,
  maxSessions: number,
): string {
  if (maxSessions <= 0) {
    return "";
  }

  const lines = normalizedLines(text);
  const sessions: string[] = [];

  for (const line of lines) {
    const sessionId = parseSessionId(line);
    if (sessionId !== undefined && !sessions.includes(sessionId)) {
      sessions.push(sessionId);
    }
  }

  const keptSessionIds = sessions.slice(-maxSessions);
  const keptLines: string[] = [];

  for (const sessionId of keptSessionIds) {
    const sessionLines = lines.filter(
      (line) => parseSessionId(line) === sessionId,
    );
    keptLines.push(...sessionLines.slice(-MAX_EVENTS_PER_SESSION));
  }

  return keptLines.length === 0 ? "" : `${keptLines.join("\n")}\n`;
}

/**
 * Persists development traces under Obsidian's hidden plugin directory. The
 * Adapter API is intentional here because Vault API does not expose hidden files.
 */
export function createObsidianDiagnosticPersistence(
  adapter: TrailDiagnosticAdapter,
  directoryPath: string,
): TrailDiagnosticPersistence {
  const filePath = `${directoryPath}/trace.jsonl`;
  let directoryReady = false;

  const ensureDirectory = async (): Promise<void> => {
    if (directoryReady) {
      return;
    }
    if (!(await adapter.exists(directoryPath))) {
      await adapter.mkdir(directoryPath);
    }
    directoryReady = true;
  };

  return {
    async appendLine(line: string): Promise<void> {
      await ensureDirectory();
      if (!(await adapter.exists(filePath))) {
        await adapter.write(filePath, line);
        return;
      }
      await adapter.append(filePath, line);
    },

    async beginSession(_sessionId: string): Promise<void> {
      await ensureDirectory();
      if (!(await adapter.exists(filePath))) {
        await adapter.write(filePath, "");
        return;
      }

      const existing = await adapter.read(filePath);
      const retained = selectRecentSessions(
        existing,
        MAX_RETAINED_SESSIONS - 1,
      );
      if (retained !== existing) {
        await adapter.write(filePath, retained);
      }
    },

    async readRecentSessions(maxSessions: number): Promise<string> {
      await ensureDirectory();
      if (!(await adapter.exists(filePath))) {
        return "";
      }
      return selectRecentSessions(await adapter.read(filePath), maxSessions);
    },

    async replaceSession(
      sessionId: string,
      lines: readonly string[],
    ): Promise<void> {
      await ensureDirectory();
      const existing = await adapter.exists(filePath)
        ? await adapter.read(filePath)
        : "";
      const previousLines = normalizedLines(existing).filter(
        (line) => parseSessionId(line) !== sessionId,
      );
      const replacementLines = lines
        .map((line) => line.trim())
        .filter((line) => parseSessionId(line) === sessionId)
        .slice(-MAX_EVENTS_PER_SESSION);
      const combined = [
        ...previousLines,
        ...replacementLines,
      ].join("\n");
      const retained = selectRecentSessions(
        combined === "" ? "" : `${combined}\n`,
        MAX_RETAINED_SESSIONS,
      );
      await adapter.write(filePath, retained);
    },
  };
}
