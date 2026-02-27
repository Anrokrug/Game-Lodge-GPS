export interface LatLng {
  lat: number
  lng: number
}

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

const HOUSES_KEY = "property_nav_houses"
const CONFIG_KEY = "property_nav_config"
const AUTH_KEY = "property_nav_auth"

const isBrowser = typeof window !== "undefined"

// ─── Houses ──────────────────────────────────────────────────────────────────

export const getHouses = (): House[] => {
  if (!isBrowser) return []
  try {
    const data = localStorage.getItem(HOUSES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export const saveHouse = (house: Omit<House, "id" | "createdAt">): House => {
  const houses = getHouses()
  const newHouse: House = {
    ...house,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  houses.push(newHouse)
  if (isBrowser) localStorage.setItem(HOUSES_KEY, JSON.stringify(houses))
  return newHouse
}

export const updateHouse = (id: string, updates: Partial<House>): House | null => {
  const houses = getHouses()
  const index = houses.findIndex((h) => h.id === id)
  if (index === -1) return null
  houses[index] = { ...houses[index], ...updates }
  if (isBrowser) localStorage.setItem(HOUSES_KEY, JSON.stringify(houses))
  return houses[index]
}

export const deleteHouse = (id: string): void => {
  const houses = getHouses().filter((h) => h.id !== id)
  if (isBrowser) localStorage.setItem(HOUSES_KEY, JSON.stringify(houses))
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const getConfig = (): PropertyConfig => {
  if (!isBrowser) return { receptionPoint: null, defaultZoom: 16, propertyName: "Zebula Golf Estate & Spa" }
  try {
    const data = localStorage.getItem(CONFIG_KEY)
    return data
      ? JSON.parse(data)
      : { receptionPoint: null, defaultZoom: 16, propertyName: "Zebula Golf Estate & Spa" }
  } catch {
    return { receptionPoint: null, defaultZoom: 16, propertyName: "Zebula Golf Estate & Spa" }
  }
}

export const saveConfig = (config: Partial<PropertyConfig>): void => {
  if (!isBrowser) return
  const current = getConfig()
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }))
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "Zebula@2025"

export const login = (password: string): boolean => {
  if (!isBrowser) return false
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(AUTH_KEY, "authenticated")
    return true
  }
  return false
}

export const logout = (): void => {
  if (isBrowser) localStorage.removeItem(AUTH_KEY)
}

export const isAuthenticated = (): boolean => {
  if (!isBrowser) return false
  try {
    return localStorage.getItem(AUTH_KEY) === "authenticated"
  } catch {
    return false
  }
}

// ─── Sync / Export / Import ───────────────────────────────────────────────────

export const exportAllData = (): string => {
  const houses = getHouses()
  const config = getConfig()
  const payload = { houses, config, exportedAt: new Date().toISOString(), version: 1 }
  return btoa(JSON.stringify(payload))
}

export const importAllData = (code: string): { success: boolean; message: string; houseCount: number } => {
  if (!isBrowser) return { success: false, message: "Not in browser", houseCount: 0 }
  try {
    const raw = atob(code.trim())
    const payload = JSON.parse(raw)
    if (!payload.houses || !Array.isArray(payload.houses)) {
      return { success: false, message: "Invalid sync code format.", houseCount: 0 }
    }
    localStorage.setItem(HOUSES_KEY, JSON.stringify(payload.houses))
    if (payload.config) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(payload.config))
    }
    return { success: true, message: `Imported ${payload.houses.length} house(s) successfully.`, houseCount: payload.houses.length }
  } catch {
    return { success: false, message: "Invalid or corrupted sync code. Please try again.", houseCount: 0 }
  }
}
