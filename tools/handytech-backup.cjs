const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const backupRoot = "/var/backups/handytech";
const appRoot = "/var/www/handytech/HandyTech-Website";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const destination = path.join(backupRoot, stamp);

fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
fs.chmodSync(backupRoot, 0o700);
fs.chmodSync(destination, 0o700);

const dump = JSON.parse(fs.readFileSync("/home/lou/.pm2/dump.pm2", "utf8"));
const app = dump.find((entry) => entry.name === "handytech");
const databaseUrl = app?.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing from the HandyTech PM2 configuration");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

run("pg_dump", ["--format=custom", "--file", path.join(destination, "database.dump"), databaseUrl]);

const mediaSources = ["server/public/uploads", "attached_assets"].filter((entry) =>
  fs.existsSync(path.join(appRoot, entry))
);
if (mediaSources.length) {
  run("tar", ["-czf", path.join(destination, "media.tar.gz"), "-C", appRoot, ...mediaSources]);
}

const privateSources = [
  path.join(appRoot, ".env"),
  path.join(appRoot, "server/data/google_tokens.json"),
  "/etc/handytech/google-oauth.json",
].filter((entry) => fs.existsSync(entry));
if (privateSources.length) {
  run("tar", ["-czf", path.join(destination, "private-config.tar.gz"), ...privateSources]);
}

fs.writeFileSync(path.join(destination, "BACKUP_COMPLETE"), `${new Date().toISOString()}\n`, { mode: 0o600 });
for (const entry of fs.readdirSync(destination)) {
  const target = path.join(destination, entry);
  if (fs.statSync(target).isFile()) fs.chmodSync(target, 0o600);
}

const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
for (const entry of fs.readdirSync(backupRoot, { withFileTypes: true })) {
  const target = path.resolve(backupRoot, entry.name);
  if (!entry.isDirectory() || path.dirname(target) !== backupRoot) continue;
  if (fs.statSync(target).mtimeMs < cutoff) fs.rmSync(target, { recursive: true, force: true });
}

console.log(`HandyTech backup completed: ${destination}`);
