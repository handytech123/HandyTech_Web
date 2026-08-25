import { db } from "../db";
import { sql } from "drizzle-orm";

const VALID_CATEGORIES = ["essential", "improvement", "specialized"];

const CATEGORY_MAP: Record<string, string> = {
  A: "essential",
  B: "improvement",
  C: "specialized",
  electrical: "essential",
  plumbing: "essential",
  tech: "essential",
  carpentry: "improvement",
  general: "essential",
};

const SEED_SERVICES = [
  { name: "Faucet Replacement", description: "Swap faucet; shutoff & test", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 1 },
  { name: "Toilet Swap", description: "Remove/replace toilet; wax ring; leak test", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 2 },
  { name: "Ceiling Fan Install", description: "Replace existing light with fan", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 3 },
  { name: "Light Fixture Replacement", description: "Replace existing ceiling/wall fixture", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 4 },
  { name: "TV Wall Mount", description: "Mount TV to wall; hide cables", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 5 },
  { name: "Drywall Patch (small)", description: "Patch small holes; sand & prime", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 6 },
  { name: "Furniture Assembly", description: "Assemble furniture using provided instructions", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 7 },
  { name: "Grab Bar Installation", description: "Install grab bar; wall anchors", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 8 },
  { name: "Garbage Disposal Install", description: "Install/replace disposal; electrical & plumbing", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 9 },
  { name: "Smart Thermostat Install", description: "Install smart thermostat; wire connection & app setup", category: "essential", basePrice: 200, priceUnit: "flat rate", estimatedDuration: "2-3 hours", displayOrder: 10 },
  { name: "Smart Doorbell Install", description: "Install smart doorbell; wiring & mobile app config", category: "essential", basePrice: 200, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 11 },
  { name: "Smart Lock Install", description: "Install smart lock; calibration & app integration", category: "essential", basePrice: 200, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 12 },
  { name: "Wi-Fi Router / Mesh Setup", description: "Install router/mesh system; basic network configuration", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 13 },
  { name: "Security Camera Install (1-2 units)", description: "Install 1-2 security cameras; mounting & app setup", category: "essential", basePrice: 150, priceUnit: "flat rate", estimatedDuration: "2 hours", displayOrder: 14 },
  { name: "Single-Room Painting", description: "Walls + trim; minor prep", category: "improvement", basePrice: 300, priceUnit: "flat rate", estimatedDuration: "4 hours", displayOrder: 1 },
  { name: "Vanity + Sink Replacement", description: "Replace vanity & top; reconnect plumbing", category: "improvement", basePrice: 300, priceUnit: "flat rate", estimatedDuration: "4 hours", displayOrder: 2 },
  { name: "Dishwasher Install/Replace", description: "Install/replace dishwasher; plumbing & electrical", category: "improvement", basePrice: 300, priceUnit: "flat rate", estimatedDuration: "4 hours", displayOrder: 3 },
  { name: "Over-the-Range Microwave Install", description: "Mount microwave; electrical connection", category: "improvement", basePrice: 300, priceUnit: "flat rate", estimatedDuration: "4 hours", displayOrder: 4 },
  { name: "Multi-Camera Install (3-6 units)", description: "Install 3-6 cameras; cabling runs & network sync", category: "improvement", basePrice: 400, priceUnit: "flat rate", estimatedDuration: "4-6 hours", displayOrder: 5 },
  { name: "Smart Home Hub Setup", description: "Setup hub & integrate multiple smart devices", category: "improvement", basePrice: 300, priceUnit: "flat rate", estimatedDuration: "4 hours", displayOrder: 6 },
  { name: "Multi-Room Painting", description: "Two+ rooms; more prep", category: "specialized", basePrice: 500, priceUnit: "flat rate", estimatedDuration: "6 hours", displayOrder: 1 },
  { name: "Small Bathroom Remodel", description: "Toilet/vanity/light/drywall/paint bundle", category: "specialized", basePrice: 600, priceUnit: "flat rate", estimatedDuration: "6 hours", displayOrder: 2 },
  { name: "Whole-Home Smart Camera System", description: "Install 7+ cameras; DVR/NVR setup & comprehensive config", category: "specialized", basePrice: 700, priceUnit: "flat rate", estimatedDuration: "6+ hours", displayOrder: 3 },
  { name: "Structured Cabling / Low-Voltage Runs", description: "Run ethernet cables; data drops & network infrastructure", category: "specialized", basePrice: 600, priceUnit: "flat rate", estimatedDuration: "6 hours", displayOrder: 4 },
  { name: "Home Theater Setup", description: "Complete theater install; projector/sound/mounting/cables", category: "specialized", basePrice: 700, priceUnit: "flat rate", estimatedDuration: "6 hours", displayOrder: 5 },
];

export async function runProductionMigration(): Promise<void> {
  console.log("🔧 Running production compatibility migration...");

  try {
    // Step 1: Add missing columns safely (IF NOT EXISTS prevents errors if already present)
    const columnMigrations = [
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS show_as_quick_pick BOOLEAN DEFAULT false`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS quick_pick_order INTEGER DEFAULT 0`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS estimated_duration VARCHAR(50)`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS skill_level VARCHAR(50) DEFAULT 'standard'`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS included_in_quote_calculator BOOLEAN DEFAULT true`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS price_unit VARCHAR(50) DEFAULT 'per hour'`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS base_price REAL`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_consent_at TIMESTAMPTZ`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_consent_source TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_disclosure_version TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_consent_ip TEXT`,
      `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_consent_user_agent TEXT`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS photo_urls TEXT[]`,
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS video_url TEXT`,
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS selected_services TEXT[]`,
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS estimated_price REAL`,
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS photo_urls TEXT[]`,
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS video_url TEXT`,
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS video_urls TEXT[]`,
      `ALTER TABLE project_gallery ADD COLUMN IF NOT EXISTS video_urls TEXT[]`,
      `ALTER TABLE project_gallery ADD COLUMN IF NOT EXISTS before_image_urls TEXT[]`,
    ];

    for (const migration of columnMigrations) {
      try {
        await db.execute(sql.raw(migration));
      } catch (err) {
        // Column may already exist in a form that causes an error — safe to continue
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("already exists")) {
          console.warn(`  ⚠️  Column migration warning: ${msg.slice(0, 120)}`);
        }
      }
    }
    console.log("  ✅ Column migration complete");

    // Friendly availability checks happen in the application; this constraint is
    // the final guard against two simultaneous requests taking overlapping slots.
    try {
      await db.execute(sql.raw(`
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_no_live_overlap
        EXCLUDE USING gist (
          tstzrange(start_timestamptz, end_timestamptz, '[)') WITH &&
        )
        WHERE (
          status IN ('scheduled', 'confirmed', 'in-progress')
          AND start_timestamptz IS NOT NULL
          AND end_timestamptz IS NOT NULL
        )
      `));
      console.log("  ✅ Appointment overlap protection enabled");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("already exists")) {
        console.warn(`  ⚠️  Appointment overlap protection warning: ${msg.slice(0, 180)}`);
      }
    }

    // Step 2: Fix wrong category values — remap old values to valid ones
    for (const [oldVal, newVal] of Object.entries(CATEGORY_MAP)) {
      await db.execute(
        sql.raw(`UPDATE services SET category = '${newVal}' WHERE category = '${oldVal}'`)
      );
    }

    // Step 3: Catch-all — any remaining non-standard categories get mapped to 'essential'
    await db.execute(
      sql.raw(
        `UPDATE services SET category = 'essential' WHERE category NOT IN ('essential', 'improvement', 'specialized')`
      )
    );
    console.log("  ✅ Category values normalised");

    // Move the original Davis Office showcase into the database-managed gallery.
    // This insert is idempotent and never overwrites later admin edits.
    await db.execute(sql.raw(`
      INSERT INTO project_gallery (
        title, description, category, image_url, before_image_url, image_urls,
        video_urls, completion_date, location, featured
      )
      SELECT
        'Davis Office Transformation',
        'A compact room transformed into a practical custom office with built-in work surfaces, open shelving, a feature wall, and refreshed flooring.',
        'carpentry',
        '/uploads/davis-office/after-desk.webp',
        '/uploads/davis-office/before-workspace.webp',
        ARRAY[
          '/uploads/davis-office/before-alcove.webp',
          '/uploads/davis-office/before-room.webp',
          '/uploads/davis-office/after-entry.webp',
          '/uploads/davis-office/after-wide.webp'
        ],
        ARRAY[
          '/uploads/davis-office/davis-office-before.mp4',
          '/uploads/davis-office/davis-office-after.mp4'
        ],
        '2026-07-31T12:00:00Z',
        'St. Louis Metro Area',
        true
      WHERE NOT EXISTS (
        SELECT 1 FROM project_gallery WHERE title = 'Davis Office Transformation'
      )
    `));
    console.log("  ✅ Database-managed gallery seed verified");

    // Preserve the known Davis Office Before photos while allowing later admin edits.
    await db.execute(sql.raw(`
      UPDATE project_gallery
      SET before_image_urls = ARRAY[
        '/uploads/davis-office/before-workspace.webp',
        '/uploads/davis-office/before-alcove.webp',
        '/uploads/davis-office/before-room.webp'
      ]
      WHERE title = 'Davis Office Transformation' AND before_image_urls IS NULL
    `));

    // Step 4: Seed services only if table is empty
    const countResult = await db.execute(sql`SELECT COUNT(*) AS count FROM services`);
    const count = Number((countResult as any).rows?.[0]?.count ?? (countResult as any)[0]?.count ?? 0);

    if (count === 0) {
      console.log("  📋 No services found — seeding default service catalogue...");
      for (const svc of SEED_SERVICES) {
        await db.execute(sql.raw(`
          INSERT INTO services (name, description, category, base_price, price_unit, is_active, estimated_duration, skill_level, included_in_quote_calculator, show_as_quick_pick, quick_pick_order, display_order)
          VALUES (
            '${svc.name.replace(/'/g, "''")}',
            '${svc.description.replace(/'/g, "''")}',
            '${svc.category}',
            ${svc.basePrice},
            '${svc.priceUnit}',
            true,
            '${svc.estimatedDuration}',
            'standard',
            true,
            false,
            0,
            ${svc.displayOrder}
          )
        `));
      }
      console.log(`  ✅ Seeded ${SEED_SERVICES.length} services`);
    } else {
      console.log(`  ✅ Services table already has ${count} rows — skipping seed`);
    }

    console.log("✅ Production migration complete");
  } catch (error) {
    console.error("❌ Production migration error:", error instanceof Error ? error.message : error);
  }
}
