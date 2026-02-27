import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

console.log("Running config migration...")

// Drop old broken table
await sql`DROP TABLE IF EXISTS property_config CASCADE`
console.log("Dropped old property_config table")

// Drop old version marker so route re-runs migration
await sql`DELETE FROM schema_version WHERE key LIKE 'config_%'`
console.log("Cleared schema version markers")

// Create fresh table with plain lat/lng columns
await sql`
  CREATE TABLE property_config (
    id INTEGER PRIMARY KEY,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    default_zoom INTEGER DEFAULT 16,
    property_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
  )
`
console.log("Created new property_config table")

await sql`
  INSERT INTO property_config (id, lat, lng, default_zoom, property_name)
  VALUES (1, NULL, NULL, 16, 'Zebula Golf Estate & Spa')
`
console.log("Inserted default row")

// Mark migration done so the API route skips its own migration
await sql`
  CREATE TABLE IF NOT EXISTS schema_version (key TEXT PRIMARY KEY, val INTEGER DEFAULT 0)
`
await sql`
  INSERT INTO schema_version (key, val) VALUES ('config_v4', 1)
  ON CONFLICT (key) DO UPDATE SET val = 1
`
console.log("Migration complete.")
