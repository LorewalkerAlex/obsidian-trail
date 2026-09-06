import type { TrailConfiguration } from "../../domain/model/trail-configuration";
import { createDefaultTrailConfiguration } from "../../domain/rules/trail-default-configuration";

export const TRAIL_FOUNDATION_REFERENCE_TIMESTAMP = Date.UTC(2026, 8, 12, 9);

let foundationStatusSequence = 0;
const baseConfiguration = createDefaultTrailConfiguration({
  createId: () => `foundation-status-${++foundationStatusSequence}`,
  timezone: "UTC",
});

export const TRAIL_FOUNDATION_CONFIGURATION: TrailConfiguration = {
  ...baseConfiguration,
  labelGroups: [
    {
      id: "foundation-area",
      name: "Area",
      registeredEntityTypes: ["initiative", "project", "issue"],
      selectionMode: "single",
    },
    {
      id: "foundation-theme",
      name: "Theme",
      registeredEntityTypes: ["issue"],
      selectionMode: "multiple",
    },
  ],
  labels: [
    { groupId: "foundation-area", id: "foundation-design", name: "Design" },
    { groupId: "foundation-area", id: "foundation-engineering", name: "Engineering" },
    { groupId: "foundation-theme", id: "foundation-onboarding", name: "Onboarding" },
    { groupId: "foundation-theme", id: "foundation-navigation", name: "Navigation" },
  ],
};
