import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync(path.join(process.cwd(),"server","utils","operating-system-migrations.ts"),"utf8");
for(const destructive of ["DROP TABLE","TRUNCATE ","DELETE FROM customers","DELETE FROM quotes","DELETE FROM consultations","DELETE FROM appointments","DELETE FROM jobs","DELETE FROM invoices"]){assert.equal(source.toUpperCase().includes(destructive.toUpperCase()),false,`Migration must not contain destructive statement: ${destructive}`);}
for(const requirement of ["pg_advisory_lock","handytech_schema_migrations","legacy_record_matches","automatically_matched","needs_review","unmatched_historical","ON CONFLICT"]){assert.equal(source.includes(requirement),true,`Migration safety requirement missing: ${requirement}`);}
console.log("Operating-system migration safety tests passed");
