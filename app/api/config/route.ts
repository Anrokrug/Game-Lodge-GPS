import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  return neon(process.env.DATABASE_URL)
}

async function ensureTable() {
  const sql = getSQL()

  // Drop and recreate if the column type is wrong (JSONB instead of TEXT)
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'property_config'
        AND column_name = 'reception_point'
        AND data_type = 'jsonb'
      ) THEN
        DROP TABLE property_config;
      END IF;
    END$$
  `

  await sql`
    CREATE TABLE IF NOT EXISTS property_config (
      id INTEGER PRIMARY KEY,
      reception_point TEXT,
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
    let receptionPoint = null
    if (row?.reception_point) {
      try { receptionPoint = typeof row.reception_point === "string" ? JSON.parse(row.reception_point) : row.reception_point } catch {}
    }
    return NextResponse.json({
      config: {
        receptionPoint,
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

    if (body.receptionPoint !== undefined) {
      // Pass the object directly — Neon serialises objects as JSONB automatically
      const rp = body.receptionPoint
      await sql`
        UPDATE property_config
        SET reception_point = ${JSON.stringify(rp)}
        WHERE id = 1
      `
    }
    if (body.defaultZoom !== undefined) {
      await sql`UPDATE property_config SET default_zoom = ${body.defaultZoom} WHERE id = 1`
    }
    if (body.propertyName !== undefined) {
      await sql`UPDATE property_config SET property_name = ${body.propertyName} WHERE id = 1`
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("POST /api/config error:", e?.message ?? e)
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}
