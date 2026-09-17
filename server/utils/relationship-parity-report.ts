import { pool } from "../db";
import { buildRelationshipParity } from "./relationship-parity";

buildRelationshipParity()
  .then((report) => {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.hardFailures > 0) process.exitCode = 1;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
