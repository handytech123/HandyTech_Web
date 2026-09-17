import { pool } from "../db";
import { buildMigrationReconciliation } from "./migration-reconciliation";
import { runOperatingSystemMigrations } from "./operating-system-migrations";

async function main(): Promise<void> {
  await runOperatingSystemMigrations();
  const report = await buildMigrationReconciliation();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.totals.lostDeleted !== 0 || report.sources.some((source) => source.accountedFor !== source.sourceTotal)) {
    throw new Error("Operating-system migration reconciliation failed");
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
