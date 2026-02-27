"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  isAuthenticated, logout, getHouses, saveHouse, deleteHouse,
  getConfig, saveConfig, type House, type LatLng, type PropertyConfig,
} from "@/lib/storage"
import {
  MapPin, LogOut, Plus, Trash2, Home, Navigation,
  Settings, CheckCircle, AlertCircle, Edit3, Circle,
} from "lucide-react"

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
  padding: "9px 16px", borderRadius: 7, fontSize: 12, fontWeight: 700,
  fontFamily: SANS, letterSpacing: "0.06em", border: "none", cursor: "pointer",
  backgroundColor: bg, color, ...extra,
})

export default function AdminDashboard() {
  const router = useRouter()
  const [houses, setHouses] = useState<House[]>([])
  const [config, setConfig] = useState<PropertyConfig | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("houses")
  const [recording, setRecording] = useState(false)
  const [recordedPath, setRecordedPath] = useState<LatLng[]>([])
  const [houseName, setHouseName] = useState("")
  const [houseDescription, setHouseDescription] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle")
  const [settingReception, setSettingReception] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/admin"); return }
    setHouses(getHouses())
    setConfig(getConfig())
  }, [router])

  const refreshHouses = useCallback(() => setHouses(getHouses()), [])

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

  const savePath = useCallback(() => {
    if (!houseName.trim() || recordedPath.length < 2) { setSaveStatus("error"); return }
    const cfg = getConfig()
    saveHouse({
      name: houseName.trim(),
      description: houseDescription.trim(),
      path: recordedPath,
      receptionPoint: cfg.receptionPoint || recordedPath[0],
    })
    setSaveStatus("success")
    setHouseName("")
    setHouseDescription("")
    setRecordedPath([])
    refreshHouses()
    setTimeout(() => { setSaveStatus("idle"); setActiveTab("houses") }, 2000)
  }, [houseName, houseDescription, recordedPath, refreshHouses])

  const handleDeleteHouse = (id: string) => {
    if (deleteConfirm === id) { deleteHouse(id); refreshHouses(); setDeleteConfirm(null) }
    else { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000) }
  }

  const handleSetReception = (latlng: LatLng) => {
    saveConfig({ receptionPoint: latlng })
    setConfig(getConfig())
    setSettingReception(false)
  }

  if (!config) return null

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: "1.5px solid #dddbd4", backgroundColor: "#f7f5f0",
    fontSize: 13, color: "#1a2a1e", fontFamily: SANS,
    outline: "none", boxSizing: "border-box",
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f7f5f0", fontFamily: SANS }}>

      {/* HEADER */}
      <header style={{ backgroundColor: DARK_GREEN, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, backgroundColor: AMBER, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={14} color="#fff" />
            </div>
            <div>
              <p style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: "#f0ede6", lineHeight: 1 }}>Property Navigator</p>
              <p style={{ fontSize: 10, color: "rgba(240,237,230,0.4)", letterSpacing: "0.14em", marginTop: 3, lineHeight: 1 }}>ADMIN</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ fontSize: 11, color: "rgba(240,237,230,0.5)", letterSpacing: "0.1em", textDecoration: "none" }}>GUEST VIEW</a>
            <button
              onClick={() => { logout(); router.push("/admin") }}
              style={{ ...btn("transparent", "rgba(240,237,230,0.8)", { border: "1px solid rgba(255,255,255,0.2)" }) }}
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", maxWidth: 1100, margin: "0 auto", padding: "0 16px", display: "flex" }}>
          {([
            { id: "houses", label: "Houses", icon: <Home size={14} /> },
            { id: "reception", label: "Reception", icon: <Settings size={14} /> },
            { id: "record", label: "Record Path", icon: <Navigation size={14} /> },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== "record" && recording) stopRecording() }}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "12px 16px",
                fontSize: 11, fontWeight: 700, fontFamily: SANS, letterSpacing: "0.1em",
                color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.45)",
                background: "none", border: "none",
                borderBottom: activeTab === tab.id ? `2.5px solid ${AMBER}` : "2.5px solid transparent",
                cursor: "pointer",
              }}
            >
              {tab.icon}
              <span>{tab.label.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "32px 16px" }}>

        {/* HOUSES TAB */}
        {activeTab === "houses" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6 }}>SAVED DESTINATIONS</p>
                <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#1a2a1e", lineHeight: 1.1 }}>Houses</h2>
              </div>
              <button onClick={() => setActiveTab("record")} style={btn(PRIMARY)}>
                <Plus size={14} /> ADD HOUSE
              </button>
            </div>

            {houses.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 24px", textAlign: "center", backgroundColor: "#fff", border: "1px solid #dddbd4", borderRadius: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #dddbd4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <Home size={24} color="#6b7c6e" />
                </div>
                <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#1a2a1e", marginBottom: 8 }}>No houses recorded yet</h3>
                <p style={{ fontSize: 13, color: "#6b7c6e", maxWidth: 280, lineHeight: 1.6 }}>
                  Go to the Record Path tab and drive from reception to each house to save a route.
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
                        title={deleteConfirm === house.id ? "Click again to confirm" : "Delete"}
                        style={{
                          width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                          backgroundColor: deleteConfirm === house.id ? DESTRUCTIVE : "transparent",
                          color: deleteConfirm === house.id ? "#fff" : "#9ca3af",
                          border: `1px solid ${deleteConfirm === house.id ? DESTRUCTIVE : "#dddbd4"}`,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "rgba(30,74,40,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Home size={20} color={PRIMARY} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: "#1a2a1e", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

        {/* RECEPTION TAB */}
        {activeTab === "reception" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6 }}>CONFIGURATION</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#1a2a1e", lineHeight: 1.1 }}>Reception Point</h2>
              <p style={{ fontSize: 13, color: "#6b7c6e", marginTop: 6 }}>All navigation routes start from this location.</p>
            </div>

            {config.receptionPoint ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 8, backgroundColor: "rgba(35,107,48,0.07)", border: "1px solid rgba(35,107,48,0.22)", flexWrap: "wrap" }}>
                <CheckCircle size={17} color={SUCCESS} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2a1e" }}>Reception point is set</p>
                  <p style={{ fontSize: 11, color: "#6b7c6e", fontFamily: "monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {config.receptionPoint.lat.toFixed(6)}, {config.receptionPoint.lng.toFixed(6)}
                  </p>
                </div>
                <button onClick={() => setSettingReception(true)} style={btn(PRIMARY, "#fff", { flexShrink: 0 })}>
                  <Edit3 size={12} /> Change
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 8, backgroundColor: "#eceae4", border: "1px solid #dddbd4" }}>
                <AlertCircle size={17} color={AMBER} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2a1e" }}>No reception point set</p>
                  <p style={{ fontSize: 12, color: "#6b7c6e", marginTop: 2 }}>Tap the map below to place your reception marker.</p>
                </div>
              </div>
            )}

            <div style={{ borderRadius: 10, overflow: "hidden", backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #dddbd4", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#1a2a1e" }}>
                  {settingReception || !config.receptionPoint ? "Tap the map to place the reception marker" : "Current reception location"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(settingReception || !config.receptionPoint) && (
                    <button
                      onClick={() => {
                        if (!navigator.geolocation) return
                        navigator.geolocation.getCurrentPosition(
                          (pos) => handleSetReception({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                          () => setGpsError("Could not get your GPS position")
                        )
                      }}
                      style={btn(AMBER)}
                    >
                      <Navigation size={12} /> Use My Location
                    </button>
                  )}
                  <button
                    onClick={() => setSettingReception((v) => !v)}
                    style={btn("#eceae4", "#1a2a1e", { border: "1px solid #dddbd4" })}
                  >
                    <MapPin size={12} /> {settingReception ? "Cancel" : "Set on Map"}
                  </button>
                </div>
              </div>
              <div style={{ height: 420 }}>
                <AdminMap
                  mode="reception"
                  receptionPoint={config.receptionPoint}
                  onReceptionSet={settingReception || !config.receptionPoint ? handleSetReception : undefined}
                  currentPosition={currentPosition}
                />
              </div>
            </div>
            {gpsError && <p style={{ fontSize: 13, color: DESTRUCTIVE }}>{gpsError}</p>}
          </div>
        )}

        {/* RECORD PATH TAB */}
        {activeTab === "record" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6 }}>PATH RECORDING</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#1a2a1e", lineHeight: 1.1 }}>Record a Route</h2>
              <p style={{ fontSize: 13, color: "#6b7c6e", marginTop: 6 }}>Enter the house name, then drive from reception to the house while recording.</p>
            </div>

            {/* Input fields */}
            <div style={{ borderRadius: 10, padding: 20, backgroundColor: "#fff", border: "1px solid #dddbd4", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label htmlFor="hname" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a2a1e", letterSpacing: "0.1em", marginBottom: 8 }}>
                  HOUSE NAME <span style={{ color: DESTRUCTIVE }}>*</span>
                </label>
                <input
                  id="hname" type="text" value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g. The Old Oak Cottage"
                  disabled={recording} style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#dddbd4")}
                />
              </div>
              <div>
                <label htmlFor="hdesc" style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a2a1e", letterSpacing: "0.1em", marginBottom: 8 }}>
                  DESCRIPTION <span style={{ fontSize: 11, fontWeight: 400, color: "#6b7c6e", letterSpacing: "normal", textTransform: "none" }}>(optional)</span>
                </label>
                <input
                  id="hdesc" type="text" value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Blue roof near the dam"
                  disabled={recording} style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = PRIMARY)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#dddbd4")}
                />
              </div>
            </div>

            {/* Recording status */}
            {recording && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 8, backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: DESTRUCTIVE, flexShrink: 0, animation: "pulse 1.2s infinite" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2a1e" }}>Recording in progress…</p>
                  <p style={{ fontSize: 12, color: "#6b7c6e", marginTop: 2 }}>
                    {recordedPath.length} GPS points recorded &mdash; drive slowly towards your destination
                  </p>
                </div>
                {currentPosition && (
                  <p style={{ fontSize: 11, color: "#6b7c6e", fontFamily: "monospace", flexShrink: 0 }}>
                    {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {!recording ? (
                <button onClick={startRecording} style={{ ...btn(PRIMARY), padding: "13px 24px", fontSize: 13, flex: 1, minWidth: 160, justifyContent: "center" }}>
                  <Circle size={14} color="#f87171" fill="#f87171" /> Start Recording
                </button>
              ) : (
                <button onClick={stopRecording} style={{ ...btn(DESTRUCTIVE), padding: "13px 24px", fontSize: 13, flex: 1, minWidth: 160, justifyContent: "center" }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: "#fff", flexShrink: 0 }} /> Stop Recording
                </button>
              )}
              {recordedPath.length >= 2 && !recording && (
                <button
                  onClick={savePath}
                  disabled={!houseName.trim()}
                  style={{ ...btn(!houseName.trim() ? "#9ca3af" : AMBER), padding: "13px 24px", fontSize: 13, flex: 1, minWidth: 160, justifyContent: "center", cursor: !houseName.trim() ? "not-allowed" : "pointer" }}
                >
                  <CheckCircle size={15} /> Save House Path
                </button>
              )}
            </div>

            {/* Status messages */}
            {saveStatus === "success" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, backgroundColor: "rgba(35,107,48,0.08)", border: "1px solid rgba(35,107,48,0.2)" }}>
                <CheckCircle size={16} color={SUCCESS} />
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1a2a1e" }}>House path saved successfully!</p>
              </div>
            )}
            {saveStatus === "error" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle size={16} color={DESTRUCTIVE} />
                <p style={{ fontSize: 13, color: DESTRUCTIVE }}>
                  {!houseName.trim() ? "Please enter a house name first." : "Record at least 2 GPS points before saving."}
                </p>
              </div>
            )}
            {gpsError && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8, backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle size={16} color={DESTRUCTIVE} />
                <p style={{ fontSize: 13, color: DESTRUCTIVE }}>{gpsError}</p>
              </div>
            )}

            {/* Map */}
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #dddbd4" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #dddbd4", backgroundColor: "#fff" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#1a2a1e" }}>Live GPS Map</p>
                <p style={{ fontSize: 11, color: "#6b7c6e", marginTop: 2 }}>
                  {recording ? "Map is following your position as you drive" : "Start recording to see your position on the map"}
                </p>
              </div>
              <div style={{ height: 400 }}>
                <AdminMap
                  mode="record"
                  receptionPoint={config.receptionPoint}
                  isRecording={recording}
                  recordedPath={recordedPath}
                  currentPosition={currentPosition}
                />
              </div>
            </div>

            {/* Instructions */}
            <div style={{ borderRadius: 10, padding: 20, backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.1em", marginBottom: 14 }}>HOW TO RECORD A PATH</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Enter the house name in the field above.",
                  "Drive to or stand at the Reception / gate point.",
                  "Tap Start Recording, then drive slowly to the house.",
                  "Tap Stop Recording when you arrive at the destination.",
                  "Tap Save House Path to store the route for guests.",
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: "rgba(30,74,40,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY }}>{i + 1}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#6b7c6e", lineHeight: 1.6 }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
