import { readFileSync } from "node:fs";

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const expectedVersion = process.argv[2] ?? null;

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

function fail(message) {
  throw new Error(`[trail release] ${message}`);
}

if (!stableVersionPattern.test(packageJson.version)) {
  fail(`package.json version must be stable x.y.z; received ${packageJson.version}`);
}

if (packageLock.version !== packageJson.version) {
  fail(
    `package-lock.json version ${packageLock.version} does not match package.json version ${packageJson.version}`,
  );
}

if (packageLock.packages?.[""]?.version !== packageJson.version) {
  fail(
    `package-lock.json root package version ${packageLock.packages?.[""]?.version ?? "missing"} does not match package.json version ${packageJson.version}`,
  );
}

if (manifest.version !== packageJson.version) {
  fail(
    `manifest.json version ${manifest.version} does not match package.json version ${packageJson.version}`,
  );
}

if (expectedVersion !== null && expectedVersion !== packageJson.version) {
  fail(
    `release tag ${expectedVersion} does not match package.json version ${packageJson.version}`,
  );
}

const recordedMinAppVersion = versions[packageJson.version];
if (
  recordedMinAppVersion !== undefined &&
  recordedMinAppVersion !== manifest.minAppVersion
) {
  fail(
    `versions.json records ${recordedMinAppVersion} for ${packageJson.version}, but manifest.json requires ${manifest.minAppVersion}`,
  );
}

if (expectedVersion !== null && recordedMinAppVersion === undefined) {
  fail(`versions.json is missing release ${packageJson.version}`);
}

console.log(`[trail release] verified ${packageJson.version}`);
