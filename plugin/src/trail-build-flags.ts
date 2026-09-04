declare const __TRAIL_DIAGNOSTICS_ENABLED__: boolean;

/** Development-only UI follows the same compile-time gate as diagnostics. */
export const TRAIL_DEVELOPMENT_UI_ENABLED =
  typeof __TRAIL_DIAGNOSTICS_ENABLED__ === "undefined"
    ? true
    : __TRAIL_DIAGNOSTICS_ENABLED__;
