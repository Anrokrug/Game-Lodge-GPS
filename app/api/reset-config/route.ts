import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    await sql`DROP TABLE IF EXISTS property_config CASCADE`
    await sql`
      CREATE TABLE property_config (
        id        INTEGER PRIMARY KEY,
        lat       DOUBLE PRECISION,
        lng       DOUBLE PRECISION,
        zoom      INTEGER DEFAULT 16,
        prop_name TEXT DEFAULT 'Zebula Golf Estate & Spa'
      )
    `
    await sql`INSERT INTO property_config (id, zoom, prop_name) VALUES (1, 16, 'Zebula Golf Estate & Spa')`
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
