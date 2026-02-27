import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set")
  return neon(process.env.DATABASE_URL)
}

async function ensureReady() {
  const sql = getSQL()

  // Step 1 — create version table
  await sql`
    CREATE TABLE IF NOT EXISTS schema_version (
      key TEXT PRIMARY KEY,
      val INTEGER DEFAULT 0
    )
  `

  // Step 2 — check if migration already done
  const ver = await sql`SELECT val FROM schema_version WHERE key = 'config_v4'`
  if (ver.length > 0) return  // already migrated, skip everything

  // Step 3 — drop old table no matter what it looks like
  await sql`DROP TABLE IF EXISTS property_config CASCADE`

  // Step 4 — create fresh table with simple numeric columns
  await sql`
    CREATE TABLE property_config (
      id INTEGER PRIMARY KEY,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      default_zoom INTEGER DEFAULT 16,
      property_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
    )
  `

  // Step 5 — insert default row
  await sql`
    INSERT INTO property_config (id, lat, lng, default_zoom, property_name)
    VALUES (1, NULL, NULL, 16, 'Zebula Golf Estate & Spa')
  `

  // Step 6 — mark migration done
  await sql`
    INSERT INTO schema_version (key, val) VALUES ('config_v4', 1)
    ON CONFLICT (key) DO UPDATE SET val = 1
  `
}

export async function GET() {
  try {
    await ensureReady()
    const sql = getSQL()
    const rows = await sql`SELECT * FROM property_config WHERE id = 1`
    const row = rows[0]
    const receptionPoint = (row?.lat != null && row?.lng != null)
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : null
    return NextResponse.json({
      config: {
        receptionPoint,
        defaultZoom: row?.default_zoom ?? 16,
        propertyName: row?.property_name ?? "Zebula Golf Estate & Spa",
      },
    })
  } catch (e: any) {
    console.error("GET /api/config:", e?.message)
    // Always return a usable fallback — never 500 on GET
    return NextResponse.json({
      config: { receptionPoint: null, defaultZoom: 16, propertyName: "Zebula Golf Estate & Spa" }
    })
  }
}

export async function POST(req: Request) {
  try {
    await ensureReady()
    const sql = getSQL()
    const body = await req.json()

    if (body.receptionPoint != null) {
      const lat = Number(body.receptionPoint.lat)
      const lng = Number(body.receptionPoint.lng)
      if (!isNaN(lat) && !isNaN(lng)) {
        await sql`UPDATE property_config SET lat = ${lat}, lng = ${lng} WHERE id = 1`
      }
    }
    if (body.defaultZoom !== undefined) {
      await sql`UPDATE property_config SET default_zoom = ${Number(body.defaultZoom)} WHERE id = 1`
    }
    if (body.propertyName !== undefined) {
      await sql`UPDATE property_config SET property_name = ${String(body.propertyName)} WHERE id = 1`
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("POST /api/config:", e?.message)
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 })
  }
}
