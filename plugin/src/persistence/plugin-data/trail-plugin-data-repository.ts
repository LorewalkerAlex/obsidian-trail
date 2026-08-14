import {
  validateTrailPluginData,
  type TrailPluginData,
} from "../../domain/trail-configuration";
import type { TrailPluginDataIO } from "../ports/trail-plugin-data-io";

export type TrailPluginDataReadResult =
  | { readonly kind: "absent" }
  | { readonly data: TrailPluginData; readonly kind: "valid" }
  | {
      readonly issues: readonly string[];
      readonly kind: "invalid";
      readonly value: unknown;
    };

export interface TrailPluginDataRepository {
  readonly read: () => Promise<TrailPluginDataReadResult>;
  readonly save: (data: TrailPluginData) => Promise<void>;
}

/**
 * Canonical plugin-data carrier boundary. Reads classify the complete persisted
 * snapshot, while writes refuse invalid snapshots before touching host storage.
 */
export function createTrailPluginDataRepository(
  io: TrailPluginDataIO,
): TrailPluginDataRepository {
  return {
    async read(): Promise<TrailPluginDataReadResult> {
      const value = await io.load();
      if (value === null || value === undefined) {
        return { kind: "absent" };
      }

      const validation = validateTrailPluginData(value);
      if (!validation.ok) {
        return {
          issues: validation.issues,
          kind: "invalid",
          value,
        };
      }

      return {
        data: validation.value,
        kind: "valid",
      };
    },

    async save(data: TrailPluginData): Promise<void> {
      const validation = validateTrailPluginData(data);
      if (!validation.ok) {
        throw new Error(
          `Refused to persist invalid Trail plugin data: ${validation.issues.join("; ")}`,
        );
      }
      await io.save(validation.value);
    },
  };
}
