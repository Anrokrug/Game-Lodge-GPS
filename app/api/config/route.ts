import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set")
  return neon(process.env.DATABASE_URL)
}

// Wipe and rebuild the table from scratch — run this whenever anything goes wrong
async function rebuildTable() {
  const sql = getSQL()
  await sql`DROP TABLE IF EXISTS property_config CASCADE`
  await sql`DROP TABLE IF EXISTS schema_version CASCADE`
  await sql`
    CREATE TABLE property_config (
      id        INTEGER PRIMARY KEY,
      lat       DOUBLE PRECISION,
      lng       DOUBLE PRECISION,
      zoom      INTEGER DEFAULT 16,
      prop_name TEXT    DEFAULT 'Zebula Golf Estate & Spa'
    )
  `
  await sql`INSERT INTO property_config (id) VALUES (1)`
}

async function readRow() {
  const sql = getSQL()
  const rows = await sql`SELECT * FROM property_config WHERE id = 1`
  return rows[0] ?? null
}

export async function GET() {
  let row: any = null
  try { row = await readRow() } catch { try { await rebuildTable(); row = await readRow() } catch {} }
  const receptionPoint = (row?.lat != null && row?.lng != null)
    ? { lat: Number(row.lat), lng: Number(row.lng) } : null
  return NextResponse.json({
    config: {
      receptionPoint,
      defaultZoom: row?.zoom ?? 16,
      propertyName: row?.prop_name ?? "Zebula Golf Estate & Spa",
    },
  })
}

export async function POST(req: Request) {
  try {
    const sql = getSQL()
    const body = await req.json()

    // Try the update — if it fails for any reason, rebuild table then retry
    const doUpdate = async () => {
      if (body.receptionPoint != null) {
        const lat = Number(body.receptionPoint.lat)
        const lng = Number(body.receptionPoint.lng)
        if (!isNaN(lat) && !isNaN(lng)) {
          await sql`UPDATE property_config SET lat = ${lat}, lng = ${lng} WHERE id = 1`
        }
      }
      if (body.defaultZoom !== undefined) {
        await sql`UPDATE property_config SET zoom = ${Number(body.defaultZoom)} WHERE id = 1`
      }
      if (body.propertyName !== undefined) {
        await sql`UPDATE property_config SET prop_name = ${String(body.propertyName)} WHERE id = 1`
      }
    }

    try {
      await doUpdate()
    } catch {
      // Table is broken — nuke it and retry once
      await rebuildTable()
      await doUpdate()
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("POST /api/config:", e?.message)
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 })
  }
}
