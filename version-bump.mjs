import { readFileSync, writeFileSync } from "node:fs";

const targetVersion = process.env.npm_package_version;
const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

if (!targetVersion || !stableVersionPattern.test(targetVersion)) {
  throw new Error(
    "npm_package_version must be a stable x.y.z version before syncing release metadata.",
  );
}

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
manifest.version = targetVersion;
writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = manifest.minAppVersion;
writeFileSync("versions.json", `${JSON.stringify(versions, null, 2)}\n`, "utf8");
