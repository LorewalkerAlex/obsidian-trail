import type { TrailPluginDataIO } from "../ports/trail-plugin-data-io";
import {
  parseTrailPluginData,
  serializeTrailPluginData,
  type TrailPluginDataIssue,
  type TrailPluginDataSnapshot,
} from "./trail-plugin-data-codec";

export type TrailPluginDataReadResult =
  | { readonly kind: "absent" }
  | { readonly kind: "valid"; readonly snapshot: TrailPluginDataSnapshot }
  | { readonly issues: readonly TrailPluginDataIssue[]; readonly kind: "invalid"; readonly value: unknown };

export interface TrailPluginDataRepository {
  readonly read: () => Promise<TrailPluginDataReadResult>;
  readonly save: (snapshot: TrailPluginDataSnapshot) => Promise<TrailPluginDataSnapshot>;
}

export function createTrailPluginDataRepository(io: TrailPluginDataIO): TrailPluginDataRepository {
  const read = async (): Promise<TrailPluginDataReadResult> => {
    const value = await io.load();
    if (value === null || value === undefined) return { kind: "absent" };
    const parsed = parseTrailPluginData(value);
    if (!parsed.ok) return { issues: parsed.issues, kind: "invalid", value };
    return { kind: "valid", snapshot: parsed.value };
  };

  return {
    read,
    async save(snapshot): Promise<TrailPluginDataSnapshot> {
      const expectedPhysical = serializeTrailPluginData(snapshot);
      await io.save(expectedPhysical);
      const authoritative = await read();
      if (authoritative.kind !== "valid") {
        throw new Error("Plugin data failed authoritative reread after save");
      }
      const actualPhysical = serializeTrailPluginData(authoritative.snapshot);
      if (JSON.stringify(actualPhysical) !== JSON.stringify(expectedPhysical)) {
        throw new Error("Plugin data authoritative reread did not match the requested snapshot");
      }
      return authoritative.snapshot;
    },
  };
}
