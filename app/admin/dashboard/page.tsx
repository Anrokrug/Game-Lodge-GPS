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

const SERIF = "var(--font-playfair, 'Playfair Display', Georgia, serif)"
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
    { id: "houses", label: "Houses", icon: <Home size={15} /> },
    { id: "reception", label: "Reception", icon: <Settings size={15} /> },
    { id: "record", label: "Record Path", icon: <Navigation size={15} /> },
  ]

  const inputClass = "w-full px-4 py-2.5 rounded-md text-sm outline-none transition-shadow"
  const inputStyle: React.CSSProperties = {
    border: "1px solid #dddbd4",
    backgroundColor: "#f7f5f0",
    color: "#1a2a1e",
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f7f5f0" }}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: DARK_GREEN }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: AMBER }}>
              <MapPin size={14} color="#fff" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "#f0ede6", fontFamily: SERIF }}>
                Property Navigator
              </p>
              <p className="text-xs leading-none mt-0.5" style={{ color: "rgba(240,237,230,0.4)", letterSpacing: "0.12em" }}>
                ADMIN
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="hidden sm:block text-xs transition-opacity"
              style={{ color: "rgba(240,237,230,0.5)", letterSpacing: "0.1em" }}
            >
              GUEST VIEW
            </a>
            <button
              onClick={() => { logout(); router.push("/admin") }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(240,237,230,0.8)", background: "none", cursor: "pointer" }}
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="flex max-w-6xl mx-auto px-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as Tab); if (tab.id !== "record" && recording) stopRecording() }}
              className="flex items-center gap-2 px-4 py-3 text-xs font-semibold transition-colors"
              style={{
                borderBottom: activeTab === tab.id ? `2px solid ${AMBER}` : "2px solid transparent",
                color: activeTab === tab.id ? "#ffffff" : "rgba(255,255,255,0.45)",
                background: "none",
                cursor: "pointer",
                letterSpacing: "0.08em",
              }}
            >
              {tab.icon}
              <span className="hidden sm:inline uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">

        {/* ── HOUSES TAB ── */}
        {activeTab === "houses" && (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: "#6b7c6e", letterSpacing: "0.12em" }}>
                  SAVED DESTINATIONS
                </p>
                <h2 className="text-2xl font-bold" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
                  Houses
                </h2>
              </div>
              <button
                onClick={() => setActiveTab("record")}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold transition-all"
                style={{ backgroundColor: PRIMARY, color: "#f7f5f0", border: "none", cursor: "pointer", letterSpacing: "0.08em" }}
              >
                <Plus size={14} />
                ADD HOUSE
              </button>
            </div>

            {houses.length === 0 ? (
              <div
                className="flex flex-col items-center py-20 text-center rounded-lg"
                style={{ backgroundColor: "#fff", border: "1px solid #dddbd4" }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ border: "2px solid #dddbd4" }}
                >
                  <Home size={24} style={{ color: "#6b7c6e" }} />
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ fontFamily: SERIF, color: "#1a2a1e" }}>
                  No houses recorded yet
                </h3>
                <p className="text-sm max-w-xs leading-relaxed" style={{ color: "#6b7c6e" }}>
                  Go to the Record Path tab and drive from reception to each house to save a route.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {houses.map((house, index) => (
                  <div
                    key={house.id}
                    className="rounded-lg p-5 transition-shadow hover:shadow-md"
                    style={{ backgroundColor: "#fff", border: "1px solid #dddbd4" }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-xs font-semibold" style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}>
                        PLOT {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className="w-7 h-7 rounded flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: deleteConfirm === house.id ? DESTRUCTIVE : "transparent",
                          color: deleteConfirm === house.id ? "#fff" : "#9ca3af",
                          border: `1px solid ${deleteConfirm === house.id ? DESTRUCTIVE : "#dddbd4"}`,
                          cursor: "pointer",
                        }}
                        title={deleteConfirm === house.id ? "Click again to confirm delete" : "Delete"}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "rgba(30,74,40,0.09)" }}
                      >
                        <Home size={20} style={{ color: PRIMARY }} />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="font-bold text-base leading-tight truncate"
                          style={{ color: "#1a2a1e", fontFamily: SERIF }}
                        >
                          {house.name}
                        </h3>
                        {house.description && (
                          <p className="text-xs truncate mt-0.5" style={{ color: "#6b7c6e" }}>
                            {house.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: "1px solid #f0ede6" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUCCESS }} />
                        <span className="text-xs" style={{ color: "#6b7c6e" }}>{house.path.length} GPS points</span>
                      </div>
                      <span className="text-xs" style={{ color: "#9ca3af" }}>
                        {new Date(house.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {deleteConfirm === house.id && (
                      <p className="text-xs text-center font-medium mt-2.5" style={{ color: DESTRUCTIVE }}>
                        Tap delete again to confirm
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECEPTION TAB ── */}
        {activeTab === "reception" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#6b7c6e", letterSpacing: "0.12em" }}>
                CONFIGURATION
              </p>
              <h2 className="text-2xl font-bold" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
                Reception Point
              </h2>
              <p className="text-sm mt-1" style={{ color: "#6b7c6e" }}>
                All navigation routes start from this location.
              </p>
            </div>

            {config.receptionPoint ? (
              <div
                className="flex items-center gap-3 p-4 rounded-md"
                style={{ backgroundColor: "rgba(35,107,48,0.07)", border: "1px solid rgba(35,107,48,0.22)" }}
              >
                <CheckCircle size={17} style={{ color: SUCCESS, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#1a2a1e" }}>Reception point is set</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#6b7c6e", fontFamily: "monospace" }}>
                    {config.receptionPoint.lat.toFixed(6)}, {config.receptionPoint.lng.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={() => setSettingReception(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all flex-shrink-0"
                  style={{ backgroundColor: PRIMARY, color: "#f7f5f0", border: "none", cursor: "pointer" }}
                >
                  <Edit3 size={12} />
                  Change
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-4 rounded-md"
                style={{ backgroundColor: "#eceae4", border: "1px solid #dddbd4" }}
              >
                <AlertCircle size={17} style={{ color: AMBER, flexShrink: 0 }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#1a2a1e" }}>No reception point set</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7c6e" }}>Tap the map below to place your reception marker.</p>
                </div>
              </div>
            )}

            <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
              <div
                className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                style={{ borderBottom: "1px solid #dddbd4" }}
              >
                <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>
                  {settingReception || !config.receptionPoint
                    ? "Tap the map to place the reception marker"
                    : "Current reception location"}
                </p>
                <div className="flex items-center gap-2">
                  {(settingReception || !config.receptionPoint) && (
                    <button
                      onClick={() => {
                        if (!navigator.geolocation) return
                        navigator.geolocation.getCurrentPosition(
                          (pos) => handleSetReception({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                          () => setGpsError("Could not get your GPS position")
                        )
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: AMBER, color: "#fff", border: "none", cursor: "pointer" }}
                    >
                      <Navigation size={12} />
                      Use My Location
                    </button>
                  )}
                  <button
                    onClick={() => setSettingReception((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
                    style={{ backgroundColor: "#eceae4", color: "#1a2a1e", border: "1px solid #dddbd4", cursor: "pointer" }}
                  >
                    <MapPin size={12} />
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

            {gpsError && (
              <p className="text-sm" style={{ color: DESTRUCTIVE }}>{gpsError}</p>
            )}
          </div>
        )}

        {/* ── RECORD PATH TAB ── */}
        {activeTab === "record" && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#6b7c6e", letterSpacing: "0.12em" }}>
                PATH RECORDING
              </p>
              <h2 className="text-2xl font-bold" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
                Record a Route
              </h2>
              <p className="text-sm mt-1" style={{ color: "#6b7c6e" }}>
                Enter the house name, then drive from reception to the house while recording.
              </p>
            </div>

            {/* Input fields */}
            <div className="rounded-lg p-5 space-y-4" style={{ backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
              <div>
                <label
                  htmlFor="hname"
                  className="block text-xs font-semibold uppercase mb-2"
                  style={{ color: "#1a2a1e", letterSpacing: "0.1em" }}
                >
                  House Name <span style={{ color: DESTRUCTIVE }}>*</span>
                </label>
                <input
                  id="hname"
                  type="text"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g. The Old Oak Cottage"
                  disabled={recording}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #1e4a28")}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
              </div>
              <div>
                <label
                  htmlFor="hdesc"
                  className="block text-xs font-semibold uppercase mb-2"
                  style={{ color: "#1a2a1e", letterSpacing: "0.1em" }}
                >
                  Description{" "}
                  <span className="normal-case font-normal text-xs" style={{ color: "#6b7c6e", letterSpacing: "normal" }}>
                    (optional)
                  </span>
                </label>
                <input
                  id="hdesc"
                  type="text"
                  value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Blue roof near the dam"
                  disabled={recording}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #1e4a28")}
                  onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                />
              </div>
            </div>

            {/* Record controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded text-sm font-semibold transition-all"
                  style={{ backgroundColor: PRIMARY, color: "#f7f5f0", border: "none", cursor: "pointer" }}
                >
                  <Circle size={14} color="#f87171" fill="#f87171" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 rounded text-sm font-semibold transition-all"
                  style={{ backgroundColor: DESTRUCTIVE, color: "#fff", border: "none", cursor: "pointer" }}
                >
                  <span className="w-3.5 h-3.5 rounded bg-white flex-shrink-0" />
                  Stop Recording
                </button>
              )}

              {recordedPath.length >= 2 && !recording && (
                <button
                  onClick={savePath}
                  disabled={!houseName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: !houseName.trim() ? "#9ca3af" : AMBER,
                    color: "#fff",
                    border: "none",
                    cursor: !houseName.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  <CheckCircle size={16} />
                  Save House Path
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="p-4 rounded-md"
                style={{
                  backgroundColor: recording ? "#fef2f2" : "#fff",
                  border: `1px solid ${recording ? "#fecaca" : "#dddbd4"}`,
                }}
              >
                <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}>
                  STATUS
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: recording ? "#ef4444" : "#9ca3af" }}
                  />
                  <span className="font-bold text-base" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
                    {recording ? "Recording" : "Idle"}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-md" style={{ backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}>
                  POINTS RECORDED
                </p>
                <p className="font-bold text-2xl" style={{ color: "#1a2a1e", fontFamily: SERIF }}>
                  {recordedPath.length}
                </p>
              </div>
            </div>

            {/* Status alerts */}
            {saveStatus === "success" && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-md"
                style={{ backgroundColor: "rgba(35,107,48,0.07)", border: "1px solid rgba(35,107,48,0.2)" }}
              >
                <CheckCircle size={16} style={{ color: SUCCESS }} />
                <p className="text-sm font-medium" style={{ color: "#1a2a1e" }}>House path saved successfully!</p>
              </div>
            )}
            {saveStatus === "error" && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-md"
                style={{ backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}
              >
                <AlertCircle size={16} style={{ color: DESTRUCTIVE }} />
                <p className="text-sm" style={{ color: DESTRUCTIVE }}>
                  {!houseName.trim() ? "Please enter a house name first." : "Record at least 2 GPS points before saving."}
                </p>
              </div>
            )}
            {gpsError && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-md"
                style={{ backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}
              >
                <AlertCircle size={16} style={{ color: DESTRUCTIVE }} />
                <p className="text-sm" style={{ color: DESTRUCTIVE }}>{gpsError}</p>
              </div>
            )}

            {/* Map */}
            {(recording || recordedPath.length > 0) && (
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #dddbd4", height: 400 }}>
                <AdminMap
                  mode="record"
                  receptionPoint={config.receptionPoint}
                  recordedPath={recordedPath}
                  currentPosition={currentPosition}
                  isRecording={recording}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
