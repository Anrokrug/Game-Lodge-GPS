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
    if (!isAuthenticated()) {
      router.replace("/admin")
      return
    }
    setHouses(getHouses())
    setConfig(getConfig())
  }, [router])

  const handleLogout = () => {
    logout()
    router.push("/admin")
  }

  const refreshHouses = useCallback(() => {
    setHouses(getHouses())
  }, [])

  const startRecording = useCallback(() => {
    setGpsError("")
    setRecordedPath([])
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported on this device.")
      return
    }
    setRecording(true)
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const point: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCurrentPosition(point)
        setRecordedPath((prev) => {
          // Only add point if moved more than ~3m to avoid noise
          if (prev.length === 0) return [point]
          const last = prev[prev.length - 1]
          const dist = Math.sqrt(
            Math.pow((point.lat - last.lat) * 111320, 2) +
              Math.pow((point.lng - last.lng) * 111320 * Math.cos((point.lat * Math.PI) / 180), 2)
          )
          if (dist > 3) return [...prev, point]
          return prev
        })
      },
      (err) => {
        setGpsError("GPS error: " + err.message)
        setRecording(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
    setWatchId(id)
  }, [])

  const stopRecording = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
    }
    setRecording(false)
  }, [watchId])

  const savePath = useCallback(() => {
    if (!houseName.trim()) {
      setSaveStatus("error")
      return
    }
    if (recordedPath.length < 2) {
      setSaveStatus("error")
      return
    }
    const cfg = getConfig()
    const receptionPoint = cfg.receptionPoint || recordedPath[0]

    saveHouse({
      name: houseName.trim(),
      description: houseDescription.trim(),
      path: recordedPath,
      receptionPoint,
    })

    setSaveStatus("success")
    setHouseName("")
    setHouseDescription("")
    setRecordedPath([])
    refreshHouses()

    setTimeout(() => {
      setSaveStatus("idle")
      setActiveTab("houses")
    }, 2000)
  }, [houseName, houseDescription, recordedPath, refreshHouses])

  const handleDeleteHouse = (id: string) => {
    if (deleteConfirm === id) {
      deleteHouse(id)
      refreshHouses()
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(id)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
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
      {/* Top Nav */}
      <header className="bg-nav-bg text-nav-text shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <MapPin className="w-4 h-4 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">Property Navigator</h1>
              <p className="text-xs opacity-60 leading-none mt-0.5">Admin Dashboard</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id !== "record" && recording) stopRecording()
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white/15 text-white border-b-2 border-accent"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* HOUSES TAB */}
        {activeTab === "houses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Saved Houses</h2>
                <p className="text-sm text-muted-foreground">{houses.length} house(s) configured</p>
              </div>
              <button
                onClick={() => setActiveTab("record")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add House
              </button>
            </div>

            {houses.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Home className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">No houses yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Go to &quot;Record Path&quot; to add your first house
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {houses.map((house) => (
                  <div
                    key={house.id}
                    className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Home className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-card-foreground">{house.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {house.path.length} GPS points
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className={`p-2 rounded-lg transition-all ${
                          deleteConfirm === house.id
                            ? "bg-destructive text-destructive-foreground"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        }`}
                        title={deleteConfirm === house.id ? "Click again to confirm" : "Delete"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {house.description && (
                      <p className="text-sm text-muted-foreground mb-3">{house.description}</p>
                    )}

                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-xs text-muted-foreground">
                        Path recorded:{" "}
                        {new Date(house.createdAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
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

        {/* RECEPTION TAB */}
        {activeTab === "reception" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Set Reception Point</h2>
              <p className="text-sm text-muted-foreground">
                This is where all navigation paths start from
              </p>
            </div>

            {config.receptionPoint ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Reception point is set</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {config.receptionPoint.lat.toFixed(6)}, {config.receptionPoint.lng.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={() => setSettingReception(true)}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all"
                >
                  <Edit3 className="w-3 h-3" />
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">No reception point set</p>
                  <p className="text-xs text-muted-foreground">
                    Click on the map or use your GPS location
                  </p>
                </div>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <p className="text-sm font-medium text-card-foreground">
                  {settingReception || !config.receptionPoint
                    ? "Click on the map to set reception point"
                    : "Current reception point on map"}
                </p>
                <div className="flex items-center gap-2">
                  {(settingReception || !config.receptionPoint) && (
                    <button
                      onClick={() => {
                        if (!navigator.geolocation) return
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            handleSetReception({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                          },
                          () => setGpsError("Could not get GPS position")
                        )
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-all"
                    >
                      <Navigation className="w-3 h-3" />
                      Use My Location
                    </button>
                  )}
                  <button
                    onClick={() => setSettingReception((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:opacity-90 transition-all"
                  >
                    <MapPin className="w-3 h-3" />
                    {settingReception ? "Cancel" : "Set on Map"}
                  </button>
                </div>
              </div>
              <div style={{ height: 400 }}>
                <AdminMap
                  mode="reception"
                  receptionPoint={config.receptionPoint}
                  onReceptionSet={settingReception || !config.receptionPoint ? handleSetReception : undefined}
                  currentPosition={currentPosition}
                />
              </div>
            </div>

            {gpsError && (
              <p className="text-sm text-destructive text-center">{gpsError}</p>
            )}
          </div>
        )}

        {/* RECORD PATH TAB */}
        {activeTab === "record" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Record Path</h2>
              <p className="text-sm text-muted-foreground">
                Drive from reception to the house while recording
              </p>
            </div>

            {/* House name & description */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-1.5">
                  House Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g. The Old Oak Cottage"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  disabled={recording}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-card-foreground block mb-1.5">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={houseDescription}
                  onChange={(e) => setHouseDescription(e.target.value)}
                  placeholder="e.g. Blue roof, near the river"
                  className="w-full px-4 py-2.5 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  disabled={recording}
                />
              </div>
            </div>

            {/* Recording controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {!recording ? (
                <button
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all shadow-md"
                >
                  <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:opacity-90 transition-all shadow-md"
                >
                  <div className="w-3 h-3 rounded-sm bg-white" />
                  Stop Recording
                </button>
              )}

              {recordedPath.length >= 2 && !recording && (
                <button
                  onClick={savePath}
                  disabled={!houseName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  <CheckCircle className="w-4 h-4" />
                  Save House Path
                </button>
              )}
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-xl border ${recording ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${recording ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                  <p className="font-semibold text-sm">{recording ? "Recording..." : "Idle"}</p>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card">
                <p className="text-xs text-muted-foreground">Points Recorded</p>
                <p className="font-semibold text-sm mt-1">{recordedPath.length} points</p>
              </div>
            </div>

            {saveStatus === "success" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30">
                <CheckCircle className="w-4 h-4 text-success" />
                <p className="text-sm font-medium text-foreground">House path saved successfully!</p>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">
                  {!houseName.trim()
                    ? "Please enter a house name first."
                    : "Record at least 2 GPS points before saving."}
                </p>
              </div>
            )}
            {gpsError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{gpsError}</p>
              </div>
            )}

            {/* Map */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border">
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
