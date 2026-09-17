import { sql } from "drizzle-orm";
import { db, pool } from "../db";

export const LEGACY_SOURCE_TABLES = [
  "customers", "quotes", "consultations", "appointments", "quote_proposals", "jobs",
  "referral_leads", "job_expenses", "change_orders", "invoices", "invoice_payments", "project_gallery",
] as const;

export type SourceReconciliation = {
  sourceTable: string;
  sourceTotal: number;
  automaticallyMatched: number;
  needsReview: number;
  unmatchedHistorical: number;
  accountedFor: number;
  lostDeleted: number;
};

async function tableExists(name: string): Promise<boolean> {
  const result = await db.execute(sql`SELECT to_regclass(${`public.${name}`}) IS NOT NULL AS exists`);
  return Boolean((result as any).rows?.[0]?.exists);
}

export async function inventoryLegacySources(): Promise<Record<string, number>> {
  const inventory: Record<string, number> = {};
  for (const table of LEGACY_SOURCE_TABLES) {
    if (!(await tableExists(table))) {
      inventory[table] = 0;
      continue;
    }
    const result = await db.execute(sql.raw(`SELECT COUNT(*)::int AS count FROM ${table}`));
    inventory[table] = Number((result as any).rows?.[0]?.count || 0);
  }
  return inventory;
}

export async function buildMigrationReconciliation(version = "20260917_002_operating_system_backfill") {
  const sourceCounts = await inventoryLegacySources();
  const hasLedger = await tableExists("legacy_record_matches");
  const dispositions = hasLedger
    ? await db.execute(sql`SELECT source_table, classification, COUNT(*)::int count FROM legacy_record_matches WHERE migration_version=${version} GROUP BY source_table,classification`)
    : { rows: [] } as any;
  const byTable = new Map<string, Record<string, number>>();
  for (const row of ((dispositions as any).rows || [])) {
    const item = byTable.get(row.source_table) || {};
    item[row.classification] = Number(row.count);
    byTable.set(row.source_table, item);
  }
  const sources: SourceReconciliation[] = LEGACY_SOURCE_TABLES.map((sourceTable) => {
    const counts = byTable.get(sourceTable) || {};
    const automaticallyMatched = counts.automatically_matched || 0;
    const needsReview = counts.needs_review || 0;
    const unmatchedHistorical = counts.unmatched_historical || 0;
    const accountedFor = automaticallyMatched + needsReview + unmatchedHistorical;
    const sourceTotal = sourceCounts[sourceTable] || 0;
    return { sourceTable, sourceTotal, automaticallyMatched, needsReview, unmatchedHistorical, accountedFor, lostDeleted: Math.max(0, sourceTotal - accountedFor) };
  });
  return {
    version,
    generatedAt: new Date().toISOString(),
    sourceCounts,
    sources,
    totals: sources.reduce((sum, item) => ({
      source: sum.source + item.sourceTotal,
      automaticallyMatched: sum.automaticallyMatched + item.automaticallyMatched,
      needsReview: sum.needsReview + item.needsReview,
      unmatchedHistorical: sum.unmatchedHistorical + item.unmatchedHistorical,
      accountedFor: sum.accountedFor + item.accountedFor,
      lostDeleted: sum.lostDeleted + item.lostDeleted,
    }), { source: 0, automaticallyMatched: 0, needsReview: 0, unmatchedHistorical: 0, accountedFor: 0, lostDeleted: 0 }),
  };
}

async function main() {
  const report = await buildMigrationReconciliation(process.argv[2]);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.totals.lostDeleted > 0) process.exitCode = 2;
  await pool.end();
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("migration-reconciliation.ts")) {
  void main().catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await pool.end();
  });
}
