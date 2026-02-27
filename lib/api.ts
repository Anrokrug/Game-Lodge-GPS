// Client-side API helpers — all data lives on the server, shared across all devices.

export interface LatLng { lat: number; lng: number }

export interface House {
  id: string
  name: string
  path: LatLng[]
  receptionPoint: LatLng
  createdAt: string
  description?: string
}

export interface PropertyConfig {
  receptionPoint: LatLng | null
  defaultZoom: number
  propertyName: string
}

// ─── Houses ──────────────────────────────────────────────────────────────────

export async function fetchHouses(): Promise<House[]> {
  const res = await fetch("/api/houses", { cache: "no-store" })
  const data = await res.json()
  return data.houses ?? []
}

export async function createHouse(house: Omit<House, "id" | "createdAt">): Promise<House> {
  const res = await fetch("/api/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(house),
  })
  const data = await res.json()
  return data.house
}

export async function removeHouse(id: string): Promise<void> {
  await fetch("/api/houses", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
}

export async function bulkImportHouses(houses: House[]): Promise<void> {
  await fetch("/api/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(houses),
  })
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function fetchConfig(): Promise<PropertyConfig> {
  const res = await fetch("/api/config", { cache: "no-store" })
  const data = await res.json()
  return data.config ?? { receptionPoint: null, defaultZoom: 16, propertyName: "Zebula Golf Estate & Spa" }
}

export async function updateConfig(config: Partial<PropertyConfig>): Promise<void> {
  await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  })
}

// ─── Auth (still localStorage — session only) ────────────────────────────────

const AUTH_KEY = "property_nav_auth"
const ADMIN_PASSWORD = "zebula2025"

const isBrowser = typeof window !== "undefined"

export function login(password: string): boolean {
  if (!isBrowser) return false
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "authenticated")
    return true
  }
  return false
}

export function logout(): void {
  if (isBrowser) localStorage.removeItem(AUTH_KEY)
}

export function isAuthenticated(): boolean {
  if (!isBrowser) return false
  try { return localStorage.getItem(AUTH_KEY) === "authenticated" } catch { return false }
}
