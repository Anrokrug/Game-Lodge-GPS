import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")
  return neon(url)
}

async function ensureTable() {
  const sql = getSQL()
  await sql`
    CREATE TABLE IF NOT EXISTS property_config (
      id        INTEGER PRIMARY KEY,
      lat       DOUBLE PRECISION,
      lng       DOUBLE PRECISION,
      zoom      INTEGER DEFAULT 16,
      prop_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
    )
  `
  await sql`
    INSERT INTO property_config (id, zoom, prop_name)
    VALUES (1, 16, 'Zebula Golf Estate & Spa')
    ON CONFLICT (id) DO NOTHING
  `
  // Add columns if table existed before without them
  await sql`ALTER TABLE property_config ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION`
  await sql`ALTER TABLE property_config ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION`
  await sql`ALTER TABLE property_config ADD COLUMN IF NOT EXISTS zoom INTEGER DEFAULT 16`
  await sql`ALTER TABLE property_config ADD COLUMN IF NOT EXISTS prop_name TEXT DEFAULT 'Zebula Golf Estate & Spa'`
}

export async function GET() {
  try {
    const sql = getSQL()
    await ensureTable()
    const rows = await sql`SELECT * FROM property_config WHERE id = 1`
    const row = rows[0]
    const receptionPoint = (row?.lat != null && row?.lng != null)
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : null
    return NextResponse.json({
      config: {
        receptionPoint,
        defaultZoom: row?.zoom ?? 16,
        propertyName: row?.prop_name ?? "Zebula Golf Estate & Spa",
      },
    })
  } catch (e: any) {
    console.error("GET /api/config error:", e?.message)
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

    if (body.receptionPoint != null) {
      const lat = Number(body.receptionPoint.lat)
      const lng = Number(body.receptionPoint.lng)
      if (!isNaN(lat) && !isNaN(lng)) {
        await sql`UPDATE property_config SET lat = ${lat}, lng = ${lng} WHERE id = 1`
      }
    }
    if (body.defaultZoom != null) {
      await sql`UPDATE property_config SET zoom = ${Number(body.defaultZoom)} WHERE id = 1`
    }
    if (body.propertyName != null) {
      await sql`UPDATE property_config SET prop_name = ${String(body.propertyName)} WHERE id = 1`
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("POST /api/config error:", e?.message)
    return NextResponse.json({ error: String(e?.message ?? "unknown error") }, { status: 500 })
  }
}
