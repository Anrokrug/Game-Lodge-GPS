import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  return neon(process.env.DATABASE_URL)
}

async function ensureTable() {
  const sql = getSQL()

  // Check if the column exists and has the right type
  const colCheck = await sql`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'property_config' AND column_name = 'reception_point'
  `

  const colType = colCheck[0]?.data_type

  // If column is not jsonb (e.g. it's text, or broken, or doesn't exist at all) — drop and recreate
  if (colType !== "jsonb") {
    await sql`DROP TABLE IF EXISTS property_config`
    await sql`
      CREATE TABLE property_config (
        id               INTEGER PRIMARY KEY,
        reception_point  JSONB,
        default_zoom     INTEGER DEFAULT 16,
        property_name    TEXT DEFAULT 'Zebula Golf Estate & Spa'
      )
    `
    await sql`
      INSERT INTO property_config (id, default_zoom, property_name)
      VALUES (1, 16, 'Zebula Golf Estate & Spa')
    `
    return
  }

  // Table is correct — just ensure the row exists
  await sql`
    INSERT INTO property_config (id, default_zoom, property_name)
    VALUES (1, 16, 'Zebula Golf Estate & Spa')
    ON CONFLICT (id) DO NOTHING
  `
}

export async function GET() {
  try {
    const sql = getSQL()
    await ensureTable()
    const rows = await sql`SELECT * FROM property_config WHERE id = 1`
    const row = rows[0]
    const rp = row?.reception_point
    const receptionPoint = rp ? (typeof rp === "string" ? JSON.parse(rp) : rp) : null
    return NextResponse.json({
      config: {
        receptionPoint,
        defaultZoom: row?.default_zoom ?? 16,
        propertyName: row?.property_name ?? "Zebula Golf Estate & Spa",
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
      await sql`UPDATE property_config SET reception_point = ${JSON.stringify(body.receptionPoint)} WHERE id = 1`
    }
    if (body.defaultZoom != null) {
      await sql`UPDATE property_config SET default_zoom = ${Number(body.defaultZoom)} WHERE id = 1`
    }
    if (body.propertyName != null) {
      await sql`UPDATE property_config SET property_name = ${String(body.propertyName)} WHERE id = 1`
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("POST /api/config error:", e?.message)
    return NextResponse.json({ error: String(e?.message ?? "unknown error") }, { status: 500 })
  }
}
