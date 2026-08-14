import type {
  TrailSourceEntry,
  TrailSourceIO,
} from "../ports/trail-source-io";

export type TrailDomainSourceParser<TResult> = (
  path: string,
  markdown: string,
) => TResult;

export interface TrailDomainSourceRepository {
  readonly create: <TResult>(
    path: string,
    markdown: string,
    parse: TrailDomainSourceParser<TResult>,
  ) => Promise<TResult>;
  readonly list: (path: string) => Promise<readonly TrailSourceEntry[]>;
  readonly process: <TResult>(
    path: string,
    transform: (latest: string) => string,
    parse: TrailDomainSourceParser<TResult>,
  ) => Promise<TResult>;
  readonly read: <TResult>(
    path: string,
    parse: TrailDomainSourceParser<TResult>,
  ) => Promise<TResult>;
}

/**
 * Canonical Domain Markdown persistence lifecycle. Managed transforms run against
 * the host's latest snapshot, then the authoritative persisted source is reread
 * and parsed before a result is returned to the caller.
 */
export function createTrailDomainSourceRepository(
  sourceIO: TrailSourceIO,
): TrailDomainSourceRepository {
  const read = async <TResult>(
    path: string,
    parse: TrailDomainSourceParser<TResult>,
  ): Promise<TResult> => parse(path, await sourceIO.read(path));

  return {
    async create<TResult>(
      path: string,
      markdown: string,
      parse: TrailDomainSourceParser<TResult>,
    ): Promise<TResult> {
      await sourceIO.create(path, markdown);
      return read(path, parse);
    },

    list: (path) => sourceIO.list(path),

    async process<TResult>(
      path: string,
      transform: (latest: string) => string,
      parse: TrailDomainSourceParser<TResult>,
    ): Promise<TResult> {
      await sourceIO.process(path, transform);
      return read(path, parse);
    },

    read,
  };
}
