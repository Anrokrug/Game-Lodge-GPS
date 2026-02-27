"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated, logout } from "@/lib/auth"
import {
  fetchHouses, createHouse, removeHouse,
  fetchConfig, updateConfig,
  type House, type LatLng, type PropertyConfig,
} from "@/lib/api"
import {
  MapPin, LogOut, Plus, Trash2, Home, Navigation,
  Settings, CheckCircle, AlertCircle, Edit3, Loader2,
} from "lucide-react"
import dynamic from "next/dynamic"
import ReceptionTab from "@/components/ReceptionTab"
const AdminMap = dynamic(() => import("@/components/AdminMap"), { ssr: false })

type Tab = "houses" | "reception" | "record"

const SERIF = "'Playfair Display', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"
const DARK_GREEN = "#122918"
const AMBER = "#c47c2a"
const PRIMARY = "#1e4a28"
const SUCCESS = "#236b30"
const DESTRUCTIVE = "#b03a2e"

const btn = (bg: string, color = "#fff", extra?: React.CSSProperties): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  padding: "9px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700,
  fontFamily: SANS, letterSpacing: "0.06em", border: "none", cursor: "pointer",
  backgroundColor: bg, color, transition: "opacity 0.15s", ...extra,
})

export default function AdminDashboard() {
  const router = useRouter()
  const [houses, setHouses] = useState<House[]>([])
  const [config, setConfig] = useState<PropertyConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("houses")

  // Recording
  const [recording, setRecording] = useState(false)
  const [recordedPath, setRecordedPath] = useState<LatLng[]>([])
  const [houseName, setHouseName] = useState("")
  const [houseDescription, setHouseDescription] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [watchId, setWatchId] = useState<number | null>(null)
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState("")



  // Houses
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load data from API
  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/admin"); return }
    async function load() {
      setLoading(true)
      const [h, cfg] = await Promise.all([fetchHouses(), fetchConfig()])
      setHouses(h)
      setConfig(cfg)
      setLoading(false)
    }
    load()
  }, [router])

  const refreshHouses = useCallback(async () => {
    const h = await fetchHouses()
    setHouses(h)
  }, [])

  // Recording
  const startRecording = useCallback(() => {
    setGpsError("")
    setRecordedPath([])
    if (!navigator.geolocation) { setGpsError("GPS not supported on this device."); return }
    setRecording(true)
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const point: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCurrentPosition(point)
        setRecordedPath((prev) => {
          if (prev.length === 0) return [point]
          const last = prev[prev.length - 1]
          const dist = Math.sqrt(
            Math.pow((point.lat - last.lat) * 111320, 2) +
            Math.pow((point.lng - last.lng) * 111320 * Math.cos((point.lat * Math.PI) / 180), 2)
          )
          return dist > 3 ? [...prev, point] : prev
        })
      },
      (err) => { setGpsError("GPS error: " + err.message); setRecording(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
    setWatchId(id)
  }, [])

  const stopRecording = useCallback(() => {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null) }
    setRecording(false)
  }, [watchId])

  const savePath = useCallback(async () => {
    if (!houseName.trim() || recordedPath.length < 2) { setSaveStatus("error"); return }
    setSaveStatus("saving")
    const cfg = config || await fetchConfig()
    await createHouse({
      name: houseName.trim(),
      description: houseDescription.trim(),
      path: recordedPath,
      receptionPoint: cfg.receptionPoint || recordedPath[0],
    })
    setSaveStatus("success")
    setHouseName("")
    setHouseDescription("")
    setRecordedPath([])
    await refreshHouses()
    setTimeout(() => { setSaveStatus("idle"); setActiveTab("houses") }, 2200)
  }, [houseName, houseDescription, recordedPath, config, refreshHouses])

  const handleDeleteHouse = useCallback(async (id: string) => {
    if (deleteConfirm === id) {
      setDeletingId(id)
      await removeHouse(id)
      await refreshHouses()
      setDeletingId(null)
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }, [deleteConfirm, refreshHouses])

  const handleSetReception = async (latlng: LatLng) => {
    await updateConfig({ receptionPoint: latlng })
    const cfg = await fetchConfig()
    setConfig(cfg)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #dddbd4", backgroundColor: "#fff",
    fontSize: 13, color: "#1a2a1e", fontFamily: SANS,
    outline: "none", boxSizing: "border-box",
  }

  if (loading || !config) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f7f5f0", gap: 16 }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Loader2 size={36} color={PRIMARY} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 14, color: "#6b7c6e", fontFamily: SANS }}>Loading estate data…</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f7f5f0", fontFamily: SANS }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>

      {/* HEADER */}
      <header style={{ backgroundColor: DARK_GREEN, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: AMBER, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: SERIF, fontSize: 13, fontWeight: 700, color: "#f0ede6", lineHeight: 1 }}>Zebula Golf Estate &amp; Spa</p>
              <p style={{ fontSize: 10, color: "rgba(240,237,230,0.4)", letterSpacing: "0.12em", marginTop: 3, lineHeight: 1 }}>ADMIN PORTAL</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ fontSize: 11, color: "rgba(240,237,230,0.5)", letterSpacing: "0.1em", textDecoration: "none" }}>GUEST VIEW</a>
            <button onClick={() => { logout(); router.push("/admin") }} style={btn("transparent", "rgba(240,237,230,0.8)", { border: "1px solid rgba(255,255,255,0.2)" })}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", maxWidth: 1100, margin: "0 auto", padding: "0 16px", display: "flex", overflowX: "auto" }}>
          {([
            { id: "houses" as Tab, label: "HOUSES", icon: <Home size={13} /> },
            { id: "reception" as Tab, label: "RECEPTION POINT", icon: <Settings size={13} /> },
            { id: "record" as Tab, label: "RECORD PATH", icon: <Navigation size={13} /> },
          ]).map((tab) => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== "record" && recording) stopRecording() }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", whiteSpace: "nowrap",
                fontSize: 11, fontWeight: 700, fontFamily: SANS, letterSpacing: "0.1em",
                color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.45)",
                background: "none", border: "none",
                borderBottom: activeTab === tab.id ? `2.5px solid ${AMBER}` : "2.5px solid transparent",
                cursor: "pointer",
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN */}
      <main style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "32px 16px" }}>

        {/* ── HOUSES TAB ── */}
        {activeTab === "houses" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6 }}>SAVED DESTINATIONS</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#1a2a1e" }}>
                  Houses <span style={{ fontSize: 16, fontWeight: 400, color: "#6b7c6e", fontFamily: SANS }}>({houses.length})</span>
                </h2>
              </div>
              <button onClick={() => setActiveTab("record")} style={btn(PRIMARY)}>
                <Plus size={14} /> Record New House
              </button>
            </div>

            {houses.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", textAlign: "center", backgroundColor: "#fff", border: "1px solid #dddbd4", borderRadius: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #dddbd4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Home size={24} color="#6b7c6e" />
                </div>
                <h3 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#1a2a1e", marginBottom: 8 }}>No houses recorded yet</h3>
                <p style={{ fontSize: 13, color: "#6b7c6e", maxWidth: 280, lineHeight: 1.6 }}>
                  Go to Record Path and drive from reception to each house to save a route.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {houses.map((house, index) => (
                  <div key={house.id} style={{ borderRadius: 10, padding: 20, backgroundColor: "#fff", border: "1px solid #dddbd4", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em" }}>
                        PLOT {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        title={deleteConfirm === house.id ? "Click again to confirm delete" : "Delete house"}
                        disabled={deletingId === house.id}
                        style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: deleteConfirm === house.id ? DESTRUCTIVE : "transparent", color: deleteConfirm === house.id ? "#fff" : "#9ca3af", border: `1px solid ${deleteConfirm === house.id ? DESTRUCTIVE : "#dddbd4"}`, cursor: "pointer" }}>
                        {deletingId === house.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "rgba(30,74,40,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Home size={20} color={PRIMARY} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#1a2a1e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {house.name}
                        </h3>
                        {house.description && (
                          <p style={{ fontSize: 12, color: "#6b7c6e", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{house.description}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ paddingTop: 12, borderTop: "1px solid #f0ede6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: SUCCESS }} />
                        <span style={{ fontSize: 11, color: "#6b7c6e" }}>{house.path.length} GPS points</span>
                      </div>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {new Date(house.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {deleteConfirm === house.id && (
                      <p style={{ fontSize: 11, textAlign: "center", color: DESTRUCTIVE, fontWeight: 600, marginTop: 10 }}>Tap delete again to confirm</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECEPTION TAB ── */}
        {activeTab === "reception" && (
          <ReceptionTab
            config={config}
            onSave={handleSetReception}
          />
        )}

        {/* ── RECORD PATH TAB ── */}
        {activeTab === "record" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6 }}>ROUTE RECORDING</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#1a2a1e" }}>Record Path</h2>
              <p style={{ fontSize: 13, color: "#6b7c6e", marginTop: 6, lineHeight: 1.6 }}>
                Enter a house name, press Start, then drive from reception to the house. Press Stop when you arrive, then save.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a2a1e", letterSpacing: "0.1em", marginBottom: 6 }}>HOUSE NAME *</label>
                <input
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g. Villa Acacia"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#dddbd4")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a2a1e", letterSpacing: "0.1em", marginBottom: 6 }}>DESCRIPTION (OPTIONAL)</label>
                <input
                  value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Near the golf course"
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#dddbd4")}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {!recording ? (
                <button onClick={startRecording} style={btn(PRIMARY)}>
                  <Navigation size={14} /> Start Recording
                </button>
              ) : (
                <button onClick={stopRecording} style={btn(DESTRUCTIVE)}>
                  <Navigation size={14} /> Stop Recording
                </button>
              )}
              {!recording && recordedPath.length > 1 && (
                <button onClick={savePath} disabled={saveStatus === "saving"} style={btn(AMBER, "#fff", { opacity: saveStatus === "saving" ? 0.7 : 1 })}>
                  {saveStatus === "saving" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle size={14} />}
                  {saveStatus === "saving" ? "Saving…" : "Save House Path"}
                </button>
              )}
              {recordedPath.length > 0 && (
                <span style={{ fontSize: 12, color: "#6b7c6e", fontWeight: 600 }}>
                  {recordedPath.length} GPS points recorded
                </span>
              )}
              {recording && (
                <span style={{ fontSize: 12, color: SUCCESS, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: SUCCESS, display: "inline-block", animation: "pulse 1s infinite" }} />
                  Recording live…
                </span>
              )}
            </div>

            {saveStatus === "success" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, backgroundColor: "rgba(35,107,48,0.07)", border: "1px solid rgba(35,107,48,0.22)" }}>
                <CheckCircle size={16} color={SUCCESS} />
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2a1e" }}>House path saved successfully — visible to all guests now!</p>
              </div>
            )}
            {saveStatus === "error" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle size={16} color={DESTRUCTIVE} />
                <p style={{ fontSize: 13, color: DESTRUCTIVE }}>
                  {!houseName.trim() ? "Please enter a house name first." : "Record at least 2 GPS points before saving."}
                </p>
              </div>
            )}
            {gpsError && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 8, backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle size={16} color={DESTRUCTIVE} />
                <p style={{ fontSize: 13, color: DESTRUCTIVE }}>{gpsError}</p>
              </div>
            )}

            {recordedPath.length > 0 && (
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #dddbd4", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", height: 380 }}>
                <AdminMap
                  mode="record"
                  receptionPoint={config?.receptionPoint ?? null}
                  recordedPath={recordedPath}
                  currentPosition={currentPosition}
                  isRecording={recording}
                />
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px", textAlign: "center", backgroundColor: DARK_GREEN }}>
        <p style={{ fontSize: 10, color: "rgba(240,237,230,0.35)", letterSpacing: "0.08em", fontFamily: SANS }}>
          ZEBULA GOLF ESTATE &amp; SPA &nbsp;&mdash;&nbsp; Developed by Anro Kruger
        </p>
      </footer>
    </div>
  )
}
