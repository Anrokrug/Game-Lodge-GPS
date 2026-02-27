import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

function getSQL() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set")
  return neon(process.env.DATABASE_URL)
}

async function ensureTables() {
  const sql = getSQL()
  await sql`
    CREATE TABLE IF NOT EXISTS houses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      path JSONB NOT NULL DEFAULT '[]',
      reception_point JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    const sql = getSQL()
    await ensureTables()
    const rows = await sql`SELECT * FROM houses ORDER BY created_at ASC`
    const houses = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      path: r.path,
      receptionPoint: r.reception_point,
      createdAt: r.created_at,
    }))
    return NextResponse.json({ houses })
  } catch (e) {
    console.error("GET /api/houses error:", e)
    return NextResponse.json({ houses: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const sql = getSQL()
    await ensureTables()
    const body = await req.json()

    if (Array.isArray(body)) {
      await sql`DELETE FROM houses`
      for (const h of body) {
        await sql`
          INSERT INTO houses (id, name, description, path, reception_point, created_at)
          VALUES (${h.id}, ${h.name}, ${h.description ?? ""}, ${JSON.stringify(h.path)}, ${JSON.stringify(h.receptionPoint)}, ${h.createdAt})
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, path = EXCLUDED.path
        `
      }
      return NextResponse.json({ success: true, count: body.length })
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    await sql`
      INSERT INTO houses (id, name, description, path, reception_point, created_at)
      VALUES (${id}, ${body.name}, ${body.description ?? ""}, ${JSON.stringify(body.path)}, ${JSON.stringify(body.receptionPoint ?? null)}, ${now})
    `
    return NextResponse.json({ house: { ...body, id, createdAt: now } })
  } catch (e) {
    console.error("POST /api/houses error:", e)
    return NextResponse.json({ error: "Failed to save house" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const sql = getSQL()
    const { id } = await req.json()
    await sql`DELETE FROM houses WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("DELETE /api/houses error:", e)
    return NextResponse.json({ error: "Failed to delete house" }, { status: 500 })
  }
}
