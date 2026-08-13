export const STATUS_CATEGORIES = [
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const;

export type StatusCategory = (typeof STATUS_CATEGORIES)[number];
export type StatusEntityType = "issue" | "project";
export type LabelEntityType = "initiative" | "project" | "issue";
export type LabelSelectionMode = "single" | "multiple";

export interface StatusDefinitionConfiguration {
  readonly id: string;
  readonly name: string;
}

export interface StatusCategoryConfiguration {
  readonly defaultId: string;
  readonly definitions: readonly StatusDefinitionConfiguration[];
}

export type EntityStatusConfiguration = Readonly<
  Record<StatusCategory, StatusCategoryConfiguration>
>;

export interface StatusConfiguration {
  readonly issue: EntityStatusConfiguration;
  readonly project: EntityStatusConfiguration;
}

export interface LabelGroupConfiguration {
  readonly id: string;
  readonly name: string;
  readonly registeredEntityTypes: readonly LabelEntityType[];
  readonly selectionMode: LabelSelectionMode;
}

export interface LabelDefinitionConfiguration {
  readonly groupId: string;
  readonly id: string;
  readonly name: string;
}

export interface LabelConfiguration {
  readonly definitions: readonly LabelDefinitionConfiguration[];
  readonly groups: readonly LabelGroupConfiguration[];
}

export interface CycleConfiguration {
  readonly defaultEndRule: "end-of-next-week";
}

export interface TemporalConfiguration {
  readonly timezone: string;
  readonly dateFormat?: string;
  readonly timeFormat?: string;
  readonly dateTimeFormat?: string;
}

export interface TrailConfiguration {
  readonly cycle: CycleConfiguration;
  readonly labels: LabelConfiguration;
  readonly statuses: StatusConfiguration;
  readonly temporal: TemporalConfiguration;
}

export interface TrailWorkspaceState {
  readonly customViews: readonly unknown[];
  readonly favorites: readonly unknown[];
  readonly home: Readonly<Record<string, unknown>>;
}

export interface TrailPluginData {
  readonly configuration: TrailConfiguration;
  readonly workspaceState: TrailWorkspaceState;
}

export type ConfigurationValidationResult =
  | {
      readonly ok: true;
      readonly value: TrailPluginData;
    }
  | {
      readonly issues: readonly string[];
      readonly ok: false;
    };

interface DefaultConfigurationOptions {
  readonly createId: () => string;
  readonly timezone: string;
}

const ISSUE_DEFAULT_NAMES: Readonly<Record<StatusCategory, string>> = {
  backlog: "Backlog",
  unstarted: "Todo",
  started: "In Progress",
  completed: "Done",
  canceled: "Canceled",
};

// These are mutable initial Configuration labels, not canonical product wording.
const PROJECT_DEFAULT_NAMES: Readonly<Record<StatusCategory, string>> = {
  backlog: "Backlog",
  unstarted: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

const LABEL_ENTITY_TYPES = new Set<LabelEntityType>([
  "initiative",
  "project",
  "issue",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): boolean {
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(value);

  return (
    requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => allowed.has(key))
  );
}

function isSupportedTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
    return true;
  } catch {
    return false;
  }
}

function createEntityStatusConfiguration(
  createId: () => string,
  names: Readonly<Record<StatusCategory, string>>,
): EntityStatusConfiguration {
  const entries = STATUS_CATEGORIES.map((category) => {
    const id = createId();
    return [
      category,
      {
        defaultId: id,
        definitions: [{ id, name: names[category] }],
      },
    ] as const;
  });

  return Object.fromEntries(entries) as unknown as EntityStatusConfiguration;
}

/**
 * Builds the initial mutable Workspace Configuration. The generated display names
 * are defaults only; StatusCategory remains the stable system semantic axis.
 */
export function createDefaultTrailPluginData(
  options: DefaultConfigurationOptions,
): TrailPluginData {
  const candidate: TrailPluginData = {
    configuration: {
      statuses: {
        issue: createEntityStatusConfiguration(
          options.createId,
          ISSUE_DEFAULT_NAMES,
        ),
        project: createEntityStatusConfiguration(
          options.createId,
          PROJECT_DEFAULT_NAMES,
        ),
      },
      labels: {
        groups: [],
        definitions: [],
      },
      cycle: {
        defaultEndRule: "end-of-next-week",
      },
      temporal: {
        timezone: options.timezone,
      },
    },
    workspaceState: {
      customViews: [],
      favorites: [],
      home: {},
    },
  };

  const validation = validateTrailPluginData(candidate);
  if (!validation.ok) {
    throw new Error(
      `Unable to build valid default Trail configuration: ${validation.issues.join("; ")}`,
    );
  }

  return validation.value;
}

function validateStatusCategory(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  issues: string[],
): void {
  if (!isRecord(value) || !hasOnlyKeys(value, ["defaultId", "definitions"])) {
    issues.push(`${path} must contain only defaultId and definitions`);
    return;
  }

  if (!isNonEmptyString(value.defaultId)) {
    issues.push(`${path}.defaultId must be a non-empty string`);
  }

  if (!Array.isArray(value.definitions) || value.definitions.length === 0) {
    issues.push(`${path}.definitions must contain at least one definition`);
    return;
  }

  const categoryIds = new Set<string>();

  value.definitions.forEach((definition, index) => {
    const definitionPath = `${path}.definitions[${index}]`;
    if (!isRecord(definition) || !hasOnlyKeys(definition, ["id", "name"])) {
      issues.push(`${definitionPath} must contain only id and name`);
      return;
    }

    if (!isNonEmptyString(definition.id)) {
      issues.push(`${definitionPath}.id must be a non-empty string`);
    } else {
      if (categoryIds.has(definition.id)) {
        issues.push(`${definitionPath}.id duplicates another definition in ${path}`);
      }
      if (seenIds.has(definition.id)) {
        issues.push(`${definitionPath}.id duplicates another StatusDefinition ID`);
      }
      categoryIds.add(definition.id);
      seenIds.add(definition.id);
    }

    if (!isNonEmptyString(definition.name)) {
      issues.push(`${definitionPath}.name must be non-empty text`);
    }
  });

  if (
    isNonEmptyString(value.defaultId) &&
    !categoryIds.has(value.defaultId)
  ) {
    issues.push(`${path}.defaultId must reference a definition in the same category`);
  }
}

function validateEntityStatuses(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  issues: string[],
): void {
  if (!isRecord(value) || !hasOnlyKeys(value, STATUS_CATEGORIES)) {
    issues.push(`${path} must contain exactly the five StatusCategory keys`);
    return;
  }

  for (const category of STATUS_CATEGORIES) {
    validateStatusCategory(value[category], `${path}.${category}`, seenIds, issues);
  }
}

function validateLabels(value: unknown, issues: string[]): void {
  if (!isRecord(value) || !hasOnlyKeys(value, ["groups", "definitions"])) {
    issues.push("configuration.labels must contain only groups and definitions");
    return;
  }

  if (!Array.isArray(value.groups)) {
    issues.push("configuration.labels.groups must be an array");
    return;
  }
  if (!Array.isArray(value.definitions)) {
    issues.push("configuration.labels.definitions must be an array");
    return;
  }

  const groupIds = new Set<string>();
  value.groups.forEach((group, index) => {
    const path = `configuration.labels.groups[${index}]`;
    if (
      !isRecord(group) ||
      !hasOnlyKeys(group, [
        "id",
        "name",
        "selectionMode",
        "registeredEntityTypes",
      ])
    ) {
      issues.push(`${path} has an invalid shape`);
      return;
    }

    if (!isNonEmptyString(group.id)) {
      issues.push(`${path}.id must be a non-empty string`);
    } else if (groupIds.has(group.id)) {
      issues.push(`${path}.id duplicates another LabelGroup ID`);
    } else {
      groupIds.add(group.id);
    }

    if (!isNonEmptyString(group.name)) {
      issues.push(`${path}.name must be non-empty text`);
    }

    if (group.selectionMode !== "single" && group.selectionMode !== "multiple") {
      issues.push(`${path}.selectionMode must be single or multiple`);
    }

    if (!Array.isArray(group.registeredEntityTypes)) {
      issues.push(`${path}.registeredEntityTypes must be an array`);
    } else {
      const registered = new Set<string>();
      group.registeredEntityTypes.forEach((entityType, entityIndex) => {
        if (
          typeof entityType !== "string" ||
          !LABEL_ENTITY_TYPES.has(entityType as LabelEntityType)
        ) {
          issues.push(
            `${path}.registeredEntityTypes[${entityIndex}] is not a supported Entity Type`,
          );
        } else if (registered.has(entityType)) {
          issues.push(`${path}.registeredEntityTypes must not contain duplicates`);
        } else {
          registered.add(entityType);
        }
      });
    }
  });

  const labelIds = new Set<string>();
  value.definitions.forEach((definition, index) => {
    const path = `configuration.labels.definitions[${index}]`;
    if (!isRecord(definition) || !hasOnlyKeys(definition, ["id", "name", "groupId"])) {
      issues.push(`${path} has an invalid shape`);
      return;
    }

    if (!isNonEmptyString(definition.id)) {
      issues.push(`${path}.id must be a non-empty string`);
    } else if (labelIds.has(definition.id)) {
      issues.push(`${path}.id duplicates another Label ID`);
    } else {
      labelIds.add(definition.id);
    }

    if (!isNonEmptyString(definition.name)) {
      issues.push(`${path}.name must be non-empty text`);
    }

    if (!isNonEmptyString(definition.groupId)) {
      issues.push(`${path}.groupId must be a non-empty string`);
    } else if (!groupIds.has(definition.groupId)) {
      issues.push(`${path}.groupId must reference an existing LabelGroup`);
    }
  });
}

/**
 * Validates one current Formal plugin-data shape. Existing unknown/POC-shaped data
 * is deliberately rejected instead of being interpreted as an empty Formal config.
 */
export function validateTrailPluginData(
  value: unknown,
): ConfigurationValidationResult {
  const issues: string[] = [];

  if (!isRecord(value) || !hasOnlyKeys(value, ["configuration", "workspaceState"])) {
    return {
      ok: false,
      issues: [
        "plugin data must contain exactly configuration and workspaceState namespaces",
      ],
    };
  }

  const configuration = value.configuration;
  if (
    !isRecord(configuration) ||
    !hasOnlyKeys(configuration, ["statuses", "labels", "cycle", "temporal"])
  ) {
    issues.push(
      "configuration must contain exactly statuses, labels, cycle, and temporal",
    );
  } else {
    const statuses = configuration.statuses;
    if (!isRecord(statuses) || !hasOnlyKeys(statuses, ["issue", "project"])) {
      issues.push("configuration.statuses must contain exactly issue and project");
    } else {
      const seenStatusIds = new Set<string>();
      validateEntityStatuses(
        statuses.issue,
        "configuration.statuses.issue",
        seenStatusIds,
        issues,
      );
      validateEntityStatuses(
        statuses.project,
        "configuration.statuses.project",
        seenStatusIds,
        issues,
      );
    }

    validateLabels(configuration.labels, issues);

    const cycle = configuration.cycle;
    if (!isRecord(cycle) || !hasOnlyKeys(cycle, ["defaultEndRule"])) {
      issues.push("configuration.cycle must contain only defaultEndRule");
    } else if (cycle.defaultEndRule !== "end-of-next-week") {
      issues.push("configuration.cycle.defaultEndRule is unsupported");
    }

    const temporal = configuration.temporal;
    if (
      !isRecord(temporal) ||
      !hasOnlyKeys(
        temporal,
        ["timezone"],
        ["dateFormat", "timeFormat", "dateTimeFormat"],
      )
    ) {
      issues.push("configuration.temporal has an invalid shape");
    } else {
      if (!isNonEmptyString(temporal.timezone)) {
        issues.push("configuration.temporal.timezone must be non-empty text");
      } else if (!isSupportedTimezone(temporal.timezone)) {
        issues.push("configuration.temporal.timezone must be a supported IANA timezone");
      }

      for (const key of ["dateFormat", "timeFormat", "dateTimeFormat"] as const) {
        const field = temporal[key];
        if (field !== undefined && !isNonEmptyString(field)) {
          issues.push(`configuration.temporal.${key} must be non-empty text when present`);
        }
      }
    }
  }

  const workspaceState = value.workspaceState;
  if (
    !isRecord(workspaceState) ||
    !hasOnlyKeys(workspaceState, ["customViews", "favorites", "home"])
  ) {
    issues.push("workspaceState must contain exactly customViews, favorites, and home");
  } else {
    if (!Array.isArray(workspaceState.customViews)) {
      issues.push("workspaceState.customViews must be an array");
    }
    if (!Array.isArray(workspaceState.favorites)) {
      issues.push("workspaceState.favorites must be an array");
    }
    if (!isRecord(workspaceState.home)) {
      issues.push("workspaceState.home must be an object");
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: value as unknown as TrailPluginData,
  };
}

export interface ResolvedStatusDefinition {
  readonly category: StatusCategory;
  readonly id: string;
  readonly name: string;
}

/** Resolves one stable StatusDefinition ID back to its fixed semantic category. */
export function resolveStatusDefinition(
  configuration: EntityStatusConfiguration,
  statusDefinitionId: string,
): ResolvedStatusDefinition | undefined {
  for (const category of STATUS_CATEGORIES) {
    const definition = configuration[category].definitions.find(
      (candidate) => candidate.id === statusDefinitionId,
    );
    if (definition !== undefined) {
      return {
        category,
        id: definition.id,
        name: definition.name,
      };
    }
  }
  return undefined;
}

/** Returns the configured default definition for a fixed StatusCategory. */
export function resolveDefaultStatusDefinition(
  configuration: EntityStatusConfiguration,
  category: StatusCategory,
): ResolvedStatusDefinition {
  const categoryConfiguration = configuration[category];
  const definition = categoryConfiguration.definitions.find(
    (candidate) => candidate.id === categoryConfiguration.defaultId,
  );
  if (definition === undefined) {
    throw new Error(`Missing default StatusDefinition for category: ${category}`);
  }
  return {
    category,
    id: definition.id,
    name: definition.name,
  };
}
