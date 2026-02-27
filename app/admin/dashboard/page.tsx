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

const DARK_GREEN = "#122918"
const AMBER = "#c47c2a"
const PRIMARY = "#1e4a28"
const SUCCESS = "#236b30"
const DESTRUCTIVE = "#b03a2e"

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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "houses", label: "Houses", icon: <Home className="w-4 h-4" /> },
    { id: "reception", label: "Reception", icon: <Settings className="w-4 h-4" /> },
    { id: "record", label: "Record Path", icon: <Navigation className="w-4 h-4" /> },
  ]

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 16px", border: "1px solid #dddbd4",
    backgroundColor: "#f7f5f0", color: "#1a2a1e", borderRadius: 4,
    fontSize: 14, outline: "none", fontFamily: "'Inter', system-ui, sans-serif",
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f7f5f0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAV */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: DARK_GREEN, color: "#f0ede6" }}>
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: AMBER }}>
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Property Navigator
              </p>
              <p className="text-xs opacity-40 leading-none mt-0.5 uppercase tracking-widest" style={{ fontSize: 10 }}>
                Admin Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs opacity-50 hover:opacity-80 transition-opacity hidden sm:block uppercase tracking-widest">
              Guest View
            </a>
            <button
              onClick={() => { logout(); router.push("/admin") }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex max-w-6xl mx-auto px-5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as Tab); if (tab.id !== "record" && recording) stopRecording() }}
              className="flex items-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors"
              style={{
                borderBottom: activeTab === tab.id ? `2px solid ${AMBER}` : "2px solid transparent",
                color: activeTab === tab.id ? "#ffffff" : "rgba(255,255,255,0.5)",
              }}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-8">

        {/* HOUSES TAB */}
        {activeTab === "houses" && (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#6b7c6e" }}>Saved destinations</p>
                <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>Houses</h2>
              </div>
              <button
                onClick={() => setActiveTab("record")}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium uppercase tracking-wider rounded transition-all"
                style={{ backgroundColor: PRIMARY, color: "#f7f5f0" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add House
              </button>
            </div>

            {houses.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center rounded" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ border: "1px solid #dddbd4" }}>
                  <Home className="w-6 h-6" style={{ color: "#6b7c6e" }} />
                </div>
                <h3 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                  No houses recorded yet
                </h3>
                <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: "#6b7c6e" }}>
                  Go to the Record Path tab and drive the route from reception to each house.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {houses.map((house, index) => (
                  <div key={house.id} className="rounded p-5 transition-shadow hover:shadow-md" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-xs uppercase tracking-widest" style={{ color: "#6b7c6e" }}>
                        Plot {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className="p-1.5 rounded transition-all"
                        style={{
                          backgroundColor: deleteConfirm === house.id ? DESTRUCTIVE : "transparent",
                          color: deleteConfirm === house.id ? "#ffffff" : "#6b7c6e",
                        }}
                        title={deleteConfirm === house.id ? "Click again to confirm" : "Delete house"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(30,74,40,0.08)" }}>
                        <Home className="w-4 h-4" style={{ color: PRIMARY }} />
                      </div>
                      <div>
                        <h3 className="font-bold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                          {house.name}
                        </h3>
                        {house.description && (
                          <p className="text-xs" style={{ color: "#6b7c6e" }}>{house.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #dddbd4" }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUCCESS }} />
                        <span className="text-xs" style={{ color: "#6b7c6e" }}>{house.path.length} GPS points</span>
                      </div>
                      <span className="text-xs" style={{ color: "#6b7c6e" }}>
                        {new Date(house.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {deleteConfirm === house.id && (
                      <p className="text-xs text-center font-medium mt-2" style={{ color: DESTRUCTIVE }}>
                        Click delete again to confirm
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RECEPTION TAB */}
        {activeTab === "reception" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#6b7c6e" }}>Configuration</p>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>Reception Point</h2>
              <p className="text-sm mt-1" style={{ color: "#6b7c6e" }}>All navigation routes start from this location.</p>
            </div>

            {config.receptionPoint ? (
              <div className="flex items-center gap-3 p-4 rounded" style={{ backgroundColor: "rgba(35,107,48,0.08)", border: "1px solid rgba(35,107,48,0.2)" }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: SUCCESS }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>Reception point is set</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7c6e", fontFamily: "monospace" }}>
                    {config.receptionPoint.lat.toFixed(6)}, {config.receptionPoint.lng.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={() => setSettingReception(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all"
                  style={{ backgroundColor: PRIMARY, color: "#f7f5f0" }}
                >
                  <Edit3 className="w-3 h-3" />
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded" style={{ backgroundColor: "#eceae4", border: "1px solid #dddbd4" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: AMBER }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>No reception point set</p>
                  <p className="text-xs" style={{ color: "#6b7c6e" }}>Click the map or use your GPS location below.</p>
                </div>
              </div>
            )}

            <div className="rounded overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
              <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: "1px solid #dddbd4" }}>
                <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>
                  {settingReception || !config.receptionPoint ? "Tap the map to place the reception marker" : "Current reception location"}
                </p>
                <div className="flex items-center gap-2">
                  {(settingReception || !config.receptionPoint) && (
                    <button
                      onClick={() => {
                        if (!navigator.geolocation) return
                        navigator.geolocation.getCurrentPosition(
                          (pos) => handleSetReception({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                          () => setGpsError("Could not get GPS position")
                        )
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all"
                      style={{ backgroundColor: AMBER, color: "#ffffff" }}
                    >
                      <Navigation className="w-3 h-3" />
                      Use My Location
                    </button>
                  )}
                  <button
                    onClick={() => setSettingReception((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all"
                    style={{ backgroundColor: "#eceae4", color: "#1a2a1e", border: "1px solid #dddbd4" }}
                  >
                    <MapPin className="w-3 h-3" />
                    {settingReception ? "Cancel" : "Set on Map"}
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

            {gpsError && <p className="text-sm" style={{ color: DESTRUCTIVE }}>{gpsError}</p>}
          </div>
        )}

        {/* RECORD PATH TAB */}
        {activeTab === "record" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#6b7c6e" }}>Path recording</p>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>Record a Route</h2>
              <p className="text-sm mt-1" style={{ color: "#6b7c6e" }}>Enter the house name, then drive from reception to the house while recording.</p>
            </div>

            <div className="rounded p-5 space-y-4" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#1a2a1e" }}>
                  House Name <span style={{ color: DESTRUCTIVE }}>*</span>
                </label>
                <input
                  type="text"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g. The Old Oak Cottage"
                  style={inputStyle}
                  disabled={recording}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#1a2a1e" }}>
                  Description <span className="font-normal normal-case tracking-normal text-xs" style={{ color: "#6b7c6e" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Blue roof near the dam"
                  style={inputStyle}
                  disabled={recording}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 text-sm font-medium rounded transition-all"
                  style={{ backgroundColor: PRIMARY, color: "#f7f5f0" }}
                >
                  <Circle className="w-3 h-3 fill-red-400 text-red-400" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 text-sm font-medium rounded transition-all"
                  style={{ backgroundColor: DESTRUCTIVE, color: "#ffffff" }}
                >
                  <span className="w-3 h-3 rounded bg-white" />
                  Stop Recording
                </button>
              )}

              {recordedPath.length >= 2 && !recording && (
                <button
                  onClick={savePath}
                  disabled={!houseName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm font-medium rounded transition-all"
                  style={{
                    backgroundColor: !houseName.trim() ? "#6b7c6e" : AMBER,
                    color: "#ffffff",
                    cursor: !houseName.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Save House Path
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded" style={{
                backgroundColor: recording ? "#fef2f2" : "#ffffff",
                border: `1px solid ${recording ? "#fecaca" : "#dddbd4"}`,
              }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: "#6b7c6e" }}>Status</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="w-2 h-2 rounded-full" style={{
                    backgroundColor: recording ? "#ef4444" : "#9ca3af",
                    animation: recording ? "pulse 2s infinite" : "none",
                  }} />
                  <p className="font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                    {recording ? "Recording" : "Idle"}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
                <p className="text-xs uppercase tracking-wider" style={{ color: "#6b7c6e" }}>Points Recorded</p>
                <p className="font-bold text-lg mt-1.5" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                  {recordedPath.length}
                </p>
              </div>
            </div>

            {saveStatus === "success" && (
              <div className="flex items-center gap-2.5 p-3 rounded" style={{ backgroundColor: "rgba(35,107,48,0.08)", border: "1px solid rgba(35,107,48,0.2)" }}>
                <CheckCircle className="w-4 h-4" style={{ color: SUCCESS }} />
                <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>House path saved successfully!</p>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2.5 p-3 rounded" style={{ backgroundColor: "rgba(176,58,46,0.08)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle className="w-4 h-4" style={{ color: DESTRUCTIVE }} />
                <p className="text-sm" style={{ color: DESTRUCTIVE }}>
                  {!houseName.trim() ? "Please enter a house name first." : "Record at least 2 GPS points before saving."}
                </p>
              </div>
            )}
            {gpsError && (
              <div className="flex items-center gap-2.5 p-3 rounded" style={{ backgroundColor: "rgba(176,58,46,0.08)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle className="w-4 h-4" style={{ color: DESTRUCTIVE }} />
                <p className="text-sm" style={{ color: DESTRUCTIVE }}>{gpsError}</p>
              </div>
            )}

            <div className="rounded overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #dddbd4" }}>
                <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>
                  {recording ? "Following your position as you drive..." : recordedPath.length > 0 ? "Recorded path preview" : "Map — start recording to see your path"}
                </p>
              </div>
              <div style={{ height: 420 }}>
                <AdminMap
                  mode="record"
                  receptionPoint={config.receptionPoint}
                  recordedPath={recordedPath}
                  currentPosition={currentPosition}
                  isRecording={recording}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
