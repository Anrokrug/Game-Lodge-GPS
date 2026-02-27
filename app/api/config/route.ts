import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  return neon(process.env.DATABASE_URL)
}

async function ensureTable() {
  const sql = getSQL()
  await sql`
    CREATE TABLE IF NOT EXISTS property_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      reception_point JSONB,
      default_zoom INTEGER DEFAULT 16,
      property_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
    )
  `
  await sql`
    INSERT INTO property_config (id, reception_point, default_zoom, property_name)
    VALUES (1, NULL, 16, 'Zebula Golf Estate & Spa')
    ON CONFLICT (id) DO NOTHING
  `
}

export async function GET() {
  try {
    const sql = getSQL()
    await ensureTable()
    const rows = await sql`SELECT * FROM property_config WHERE id = 1`
    const row = rows[0]
    return NextResponse.json({
      config: {
        receptionPoint: row?.reception_point ?? null,
        defaultZoom: row?.default_zoom ?? 16,
        propertyName: row?.property_name ?? "Zebula Golf Estate & Spa",
      },
    })
  } catch (e) {
    console.error("GET /api/config error:", e)
    return NextResponse.json({
      config: { receptionPoint: null, defaultZoom: 16, propertyName: "Zebula Golf Estate & Spa" },
    })
  }
}

export async function POST(req: Request) {
  try {
    const sql = getSQL()
    await ensureTable()
    const body = await req.json()
    await sql`
      UPDATE property_config SET
        reception_point = COALESCE(${body.receptionPoint ? JSON.stringify(body.receptionPoint) : null}::jsonb, reception_point),
        default_zoom    = COALESCE(${body.defaultZoom ?? null}, default_zoom),
        property_name   = COALESCE(${body.propertyName ?? null}, property_name)
      WHERE id = 1
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("POST /api/config error:", e)
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 })
  }
}
