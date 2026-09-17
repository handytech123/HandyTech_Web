import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const read=(file:string)=>fs.readFileSync(path.join(process.cwd(),file),"utf8");
const schema=read("shared/schema.ts"),routes=read("server/routes.ts"),migrations=read("server/utils/operating-system-migrations.ts"),admin=read("client/src/pages/admin.tsx"),requestsManager=read("client/src/components/requests-manager.tsx"),requestUi=read("client/src/components/request-actions.tsx"),jobUi=read("client/src/components/project-workspace.tsx"),portal=read("client/src/pages/customer-portal.tsx"),architecture=read("HANDYTECH_OPERATING_SYSTEM_ARCHITECTURE.md");
for(const entity of ["properties","contactProperties","requests","requestActivities","estimates","estimateItems","approvedScopes","workLogs","activityEvents","mediaAssets","jobCloseoutItems","automationActions","workers","scheduleAssignments","businessExpenses","legacyRecordMatches"]){assert.match(schema,new RegExp(`export const ${entity}\\s*=`),`Target entity missing: ${entity}`);}
for(const endpoint of ["/api/admin/os/requests","/api/admin/os/contacts/:id","/api/admin/os/properties/:id","/api/admin/os/today","/api/admin/os/reconciliation","/api/admin/os/parity","/api/admin/os/matches","/api/admin/os/automation-actions","/api/admin/operations/jobs/:id/workspace","/api/portal/projects","/api/portal/projects/:id/messages"]){assert.ok(routes.includes(endpoint),`Lifecycle endpoint missing: ${endpoint}`);}
for(const legacyRoute of ["/api/quotes","/api/consultations","/api/appointments","/api/quote-proposals/:token","/api/invoices/:token","/api/portal/profile"]){assert.ok(routes.includes(legacyRoute),`Compatibility route missing: ${legacyRoute}`);}
for(const nav of [">Today<",">Requests<",">Jobs<",">Contacts<",">Money<",">Business<"]){assert.ok(admin.includes(nav),`Owner navigation missing: ${nav}`);}
for(const [retired,target] of [["quotes","requests"],["consultations","requests"],["appointments","calendar"],["invoices","money"],["customers","contacts"]]){assert.ok(admin.includes(`${retired}: "${target}"`),`Retired ${retired} destination does not resolve to ${target}`);}
for(const retiredOption of ['value="quotes">Legacy Quotes','value="consultations">Consultations','value="appointments">Appointments','value="invoices">Invoices','value="customers">Legacy Customers']){assert.ok(!admin.includes(`<SelectItem ${retiredOption}`),`Retired owner navigation remains exposed: ${retiredOption}`);}
for(const action of ["Internal note","Ask customer","Site visit","Internal estimate","Customer proposal"]){assert.ok(requestUi.includes(action),`Request-local action missing: ${action}`);}
assert.ok(requestsManager.includes("Scheduled visits & history"),"Request Workspace does not expose complete visit history");
for(const area of [">Overview<",">Scope<",">Work<",">Schedule<",">Money<","Files & Photos",">Closeout<"]){assert.ok(jobUi.includes(area),`Job Workspace area missing: ${area}`);}
for(const portalArea of ["Your Projects","Message HandyTech","Balance due","Next scheduled visit"]){assert.ok(portal.includes(portalArea),`Project portal behavior missing: ${portalArea}`);}
for(const safety of ["Automatically matched","Needs review","Unmatched historical","Lost/deleted","No existing production record may disappear"]){assert.ok(architecture.includes(safety),`Migration invariant missing: ${safety}`);}
assert.ok(routes.includes("ENABLE_OPERATING_SYSTEM_MIGRATIONS"),"Compatibility feature gate is missing");assert.ok(migrations.includes("pg_advisory_lock"),"Migration advisory lock is missing");
assert.ok(requestsManager.includes('queryKey: ["/api/admin/os/today"]'),"Request changes do not refresh the Today command center");
console.log("Operating-system architecture compliance tests passed");
