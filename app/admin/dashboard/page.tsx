"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import {
  isAuthenticated,
  logout,
  getHouses,
  saveHouse,
  deleteHouse,
  getConfig,
  saveConfig,
  type House,
  type LatLng,
  type PropertyConfig,
} from "@/lib/storage"
import {
  MapPin,
  LogOut,
  Plus,
  Trash2,
  Home,
  Navigation,
  Settings,
  CheckCircle,
  AlertCircle,
  Edit3,
  Circle,
} from "lucide-react"

const AdminMap = dynamic(() => import("@/components/AdminMap"), { ssr: false })

type Tab = "houses" | "reception" | "record"

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

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Top nav ── */}
      <header className="bg-hero-bg text-nav-text sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-accent rounded-sm flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-serif text-sm font-semibold leading-none tracking-wide">
                Property Navigator
              </p>
              <p className="text-[10px] uppercase tracking-widest opacity-40 leading-none mt-0.5">
                Admin Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-[11px] uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity hidden sm:block"
            >
              Guest View
            </a>
            <button
              onClick={() => { logout(); router.push("/admin") }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-white/20 rounded-sm hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Sign out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10 max-w-6xl mx-auto px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== "record" && recording) stopRecording() }}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-accent text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-8">

        {/* ── HOUSES TAB ── */}
        {activeTab === "houses" && (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                  Saved destinations
                </p>
                <h2 className="font-serif text-2xl font-bold text-foreground">
                  Houses
                </h2>
              </div>
              <button
                onClick={() => setActiveTab("record")}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-medium uppercase tracking-wider rounded-sm hover:opacity-90 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add House
              </button>
            </div>

            {houses.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center bg-card border border-border rounded-sm">
                <div className="w-14 h-14 border border-border rounded-full flex items-center justify-center mb-4">
                  <Home className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground">No houses recorded yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                  Go to the Record Path tab and drive the route from reception to each house.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {houses.map((house, index) => (
                  <div
                    key={house.id}
                    className="bg-card border border-border rounded-sm p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Plot {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className={`p-1.5 rounded-sm transition-all ${
                          deleteConfirm === house.id
                            ? "bg-destructive text-destructive-foreground"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive-subtle"
                        }`}
                        title={deleteConfirm === house.id ? "Click again to confirm deletion" : "Delete house"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-primary-subtle rounded-sm flex items-center justify-center flex-shrink-0">
                        <Home className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif font-semibold text-card-foreground leading-tight">
                          {house.name}
                        </h3>
                        {house.description && (
                          <p className="text-xs text-muted-foreground">{house.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span className="text-[11px] text-muted-foreground">
                          {house.path.length} GPS points
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(house.createdAt).toLocaleDateString("en-ZA", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    </div>

                    {deleteConfirm === house.id && (
                      <p className="text-xs text-destructive mt-2 text-center font-medium">
                        Click delete again to confirm
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
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                Configuration
              </p>
              <h2 className="font-serif text-2xl font-bold text-foreground">
                Reception Point
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                All navigation routes start from this location.
              </p>
            </div>

            {config.receptionPoint ? (
              <div className="flex items-center gap-3 p-4 bg-success-subtle border border-success-subtle rounded-sm">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Reception point is set</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {config.receptionPoint.lat.toFixed(6)}, {config.receptionPoint.lng.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={() => setSettingReception(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-sm hover:opacity-90 transition-all"
                >
                  <Edit3 className="w-3 h-3" />
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-muted border border-border rounded-sm">
                <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">No reception point set</p>
                  <p className="text-xs text-muted-foreground">Click the map or use your GPS location below.</p>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-medium text-card-foreground">
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
                          () => setGpsError("Could not get GPS position")
                        )
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground text-xs font-medium rounded-sm hover:opacity-90 transition-all"
                    >
                      <Navigation className="w-3 h-3" />
                      Use My Location
                    </button>
                  )}
                  <button
                    onClick={() => setSettingReception((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-sm hover:opacity-90 transition-all border border-border"
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

            {gpsError && (
              <p className="text-sm text-destructive">{gpsError}</p>
            )}
          </div>
        )}

        {/* ── RECORD PATH TAB ── */}
        {activeTab === "record" && (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                Path recording
              </p>
              <h2 className="font-serif text-2xl font-bold text-foreground">
                Record a Route
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the house name, then drive from reception to the house while recording.
              </p>
            </div>

            {/* House details */}
            <div className="bg-card border border-border rounded-sm p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-foreground mb-2">
                  House Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g. The Old Oak Cottage"
                  className="w-full px-4 py-2.5 border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm text-sm transition-all"
                  disabled={recording}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-foreground mb-2">
                  Description <span className="text-muted-foreground font-normal normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Blue roof near the dam"
                  className="w-full px-4 py-2.5 border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded-sm text-sm transition-all"
                  disabled={recording}
                />
              </div>
            </div>

            {/* Controls + stats row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:opacity-90 transition-all"
                >
                  <Circle className="w-3 h-3 fill-red-400 text-red-400" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3 px-6 bg-destructive text-destructive-foreground text-sm font-medium rounded-sm hover:opacity-90 transition-all"
                >
                  <span className="w-3 h-3 bg-white rounded-sm" />
                  Stop Recording
                </button>
              )}

              {recordedPath.length >= 2 && !recording && (
                <button
                  onClick={savePath}
                  disabled={!houseName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-accent text-accent-foreground text-sm font-medium rounded-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save House Path
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 border rounded-sm ${recording ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`w-2 h-2 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                  <p className="font-serif font-semibold text-foreground">{recording ? "Recording" : "Idle"}</p>
                </div>
              </div>
              <div className="p-4 border border-border bg-card rounded-sm">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Points Recorded</p>
                <p className="font-serif font-semibold text-foreground mt-1.5 text-lg">{recordedPath.length}</p>
              </div>
            </div>

            {saveStatus === "success" && (
              <div className="flex items-center gap-2.5 p-3 bg-success-subtle border border-success-subtle rounded-sm">
                <CheckCircle className="w-4 h-4 text-success" />
                <p className="text-sm font-medium text-foreground">House path saved successfully!</p>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2.5 p-3 bg-destructive-subtle border border-destructive-subtle rounded-sm">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">
                  {!houseName.trim()
                    ? "Please enter a house name first."
                    : "Record at least 2 GPS points before saving."}
                </p>
              </div>
            )}
            {gpsError && (
              <div className="flex items-center gap-2.5 p-3 bg-destructive-subtle border border-destructive-subtle rounded-sm">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{gpsError}</p>
              </div>
            )}

            {/* Map */}
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-card-foreground">
                  {recording
                    ? "Following your position as you drive..."
                    : recordedPath.length > 0
                    ? "Recorded path preview"
                    : "Map — start recording to see your path"}
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
