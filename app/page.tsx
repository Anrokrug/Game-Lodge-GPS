"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { getHouses, getConfig, type House, type LatLng } from "@/lib/storage"
import {
  MapPin,
  Home,
  Navigation,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Locate,
  ChevronRight,
} from "lucide-react"

const ClientMap = dynamic(() => import("@/components/ClientMap"), { ssr: false })

type Screen = "select" | "navigate"

const DARK_GREEN = "#122918"
const AMBER = "#c47c2a"
const SUCCESS = "#236b30"
const DESTRUCTIVE = "#b03a2e"

export default function ClientPage() {
  const [houses, setHouses] = useState<House[]>([])
  const [screen, setScreen] = useState<Screen>("select")
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null)
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState("")
  const [gpsReady, setGpsReady] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [arrived, setArrived] = useState(false)
  const [propertyName, setPropertyName] = useState("The Estate")
  const [receptionPoint, setReceptionPoint] = useState<LatLng | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    setHouses(getHouses())
    const cfg = getConfig()
    setPropertyName(cfg.propertyName || "The Estate")
    setReceptionPoint(cfg.receptionPoint)
  }, [])

  useEffect(() => {
    setReceptionPoint(getConfig().receptionPoint)
  }, [screen])

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("GPS not available on this device."); return }
    setGpsLoading(true)
    setGpsError("")
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsReady(true)
        setGpsLoading(false)
      },
      (err) => {
        setGpsError("Location error: " + err.message + ". Please allow location access.")
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setGpsReady(false)
    setCurrentPosition(null)
  }, [])

  useEffect(() => {
    if (!currentPosition || !selectedHouse || arrived) return
    const dest = selectedHouse.path[selectedHouse.path.length - 1]
    if (!dest) return
    const dist = Math.sqrt(
      Math.pow((currentPosition.lat - dest.lat) * 111320, 2) +
      Math.pow((currentPosition.lng - dest.lng) * 111320 * Math.cos((currentPosition.lat * Math.PI) / 180), 2)
    )
    if (dist < 50) setArrived(true)
  }, [currentPosition, selectedHouse, arrived])

  const handleSelectHouse = (house: House) => {
    setSelectedHouse(house)
    setArrived(false)
    setScreen("navigate")
    startGPS()
  }

  const handleBack = () => {
    stopGPS()
    setScreen("select")
    setSelectedHouse(null)
    setArrived(false)
    setGpsError("")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f7f5f0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* NAV */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: DARK_GREEN, color: "#f0ede6" }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          {screen === "navigate" && (
            <button
              onClick={handleBack}
              className="p-2 rounded-md transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: AMBER }}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight truncate" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                {propertyName}
              </p>
              <p className="text-xs opacity-50 leading-tight tracking-widest uppercase">
                {screen === "navigate" && selectedHouse ? selectedHouse.name : "Guest Navigation"}
              </p>
            </div>
          </div>
          <a
            href="/admin"
            className="text-xs uppercase tracking-widest px-3 py-1.5 rounded transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.2)", color: "rgba(240,237,230,0.8)" }}
          >
            Admin
          </a>
        </div>
      </header>

      {/* HOUSE SELECTION */}
      {screen === "select" && (
        <main className="flex-1 flex flex-col">

          {/* Hero */}
          <div className="pb-10 pt-8 px-5" style={{ backgroundColor: DARK_GREEN, color: "#f0ede6" }}>
            <div className="max-w-5xl mx-auto">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ opacity: 0.5 }}>
                Welcome to {propertyName}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                Where would you<br />like to go?
              </h1>
              <p className="mt-3 text-sm leading-relaxed max-w-sm" style={{ opacity: 0.6 }}>
                Select your destination and we will guide you along the recorded route.
              </p>
            </div>
          </div>

          {/* Wave */}
          <div style={{ backgroundColor: DARK_GREEN }}>
            <svg viewBox="0 0 1440 40" className="w-full block" preserveAspectRatio="none" style={{ height: 40 }}>
              <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f7f5f0" />
            </svg>
          </div>

          {/* Cards */}
          <div className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">
            {houses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ border: "2px solid #dddbd4" }}>
                  <Home className="w-7 h-7" style={{ color: "#6b7c6e" }} />
                </div>
                <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                  No destinations yet
                </h3>
                <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: "#6b7c6e" }}>
                  The property owner needs to record paths via the admin panel first.
                </p>
                <a
                  href="/admin"
                  className="mt-6 px-5 py-2.5 text-sm font-medium rounded transition-all"
                  style={{ backgroundColor: "#1e4a28", color: "#f7f5f0" }}
                >
                  Open Admin Panel
                </a>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {houses.map((house, index) => (
                  <button
                    key={house.id}
                    onClick={() => handleSelectHouse(house)}
                    className="group text-left rounded p-5 transition-all duration-200 active:scale-[0.98] hover:shadow-lg"
                    style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-xs uppercase tracking-widest font-medium" style={{ color: "#6b7c6e" }}>
                        Plot {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ border: "1px solid #dddbd4" }}>
                        <ChevronRight className="w-3.5 h-3.5" style={{ color: "#6b7c6e" }} />
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(30,74,40,0.08)" }}>
                        <Home className="w-5 h-5" style={{ color: "#1e4a28" }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                          {house.name}
                        </h3>
                        {house.description && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: "#6b7c6e" }}>{house.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 flex items-center gap-1.5" style={{ borderTop: "1px solid #dddbd4" }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SUCCESS }} />
                      <span className="text-xs" style={{ color: "#6b7c6e" }}>
                        {house.path.length} waypoints &mdash; route ready
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="py-4 text-center" style={{ borderTop: "1px solid #dddbd4" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "#6b7c6e" }}>
              {propertyName} &mdash; GPS Guided Routes
            </p>
          </footer>
        </main>
      )}

      {/* NAVIGATION SCREEN */}
      {screen === "navigate" && selectedHouse && (
        <div className="flex-1 flex flex-col">

          {/* GPS bar */}
          <div className="px-5 py-3" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #dddbd4" }}>
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                  backgroundColor: gpsReady ? SUCCESS : gpsLoading ? "#c47c2a" : "#9ca3af",
                  animation: (gpsReady || gpsLoading) ? "pulse 2s infinite" : "none"
                }} />
                <span className="text-sm font-medium" style={{ color: "#1a2a1e" }}>
                  {gpsReady ? "Live GPS — map is following you" : gpsLoading ? "Acquiring GPS signal..." : "GPS inactive"}
                </span>
              </div>
              {!gpsReady && !gpsLoading && (
                <button
                  onClick={startGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-all"
                  style={{ backgroundColor: "#1e4a28", color: "#f7f5f0" }}
                >
                  <Locate className="w-3 h-3" />
                  Enable GPS
                </button>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="mx-5 mt-3 max-w-5xl">
              <div className="flex items-start gap-2.5 p-3 rounded" style={{ backgroundColor: "rgba(176,58,46,0.08)", border: "1px solid rgba(176,58,46,0.2)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: DESTRUCTIVE }} />
                <p className="text-sm leading-relaxed" style={{ color: DESTRUCTIVE }}>{gpsError}</p>
              </div>
            </div>
          )}

          {arrived && (
            <div className="mx-5 mt-3 max-w-5xl">
              <div className="flex items-center gap-3 p-4 rounded" style={{ backgroundColor: "rgba(35,107,48,0.08)", border: "1px solid rgba(35,107,48,0.2)" }}>
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: SUCCESS }} />
                <div>
                  <p className="font-semibold" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1a2a1e" }}>
                    You have arrived
                  </p>
                  <p className="text-sm" style={{ color: "#6b7c6e" }}>
                    Welcome to <strong style={{ color: "#1a2a1e" }}>{selectedHouse.name}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Route indicator */}
          <div className="px-5 py-3 max-w-5xl w-full mx-auto">
            <div className="flex items-center gap-3 text-xs" style={{ color: "#6b7c6e" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: "#1e4a28" }} />
                <span>Reception</span>
              </div>
              <div className="flex-1 border-t border-dashed relative" style={{ borderColor: "#dddbd4" }}>
                <Navigation className="w-3 h-3 absolute left-1/2 -translate-x-1/2 -top-1.5" style={{ color: AMBER }} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded border-2 border-white shadow" style={{ backgroundColor: AMBER }} />
                <span className="font-medium" style={{ color: "#1a2a1e" }}>{selectedHouse.name}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 px-5 pb-5">
            <div className="h-full min-h-[420px] rounded overflow-hidden shadow-sm" style={{ border: "1px solid #dddbd4" }}>
              {receptionPoint ? (
                <ClientMap
                  path={selectedHouse.path}
                  receptionPoint={receptionPoint}
                  currentPosition={currentPosition}
                  destinationName={selectedHouse.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center" style={{ backgroundColor: "#eceae4" }}>
                  <div className="text-center px-6">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: "#6b7c6e" }} />
                    <p className="text-sm leading-relaxed" style={{ color: "#6b7c6e" }}>
                      No reception point set. Please contact the property owner.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="px-5 pb-6 max-w-5xl w-full mx-auto">
            <div className="rounded p-4" style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#6b7c6e" }}>How to follow the route</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  "The green line is the recorded road to your destination.",
                  "Your live position is the blue dot — the map follows you.",
                  "The green R marker shows the Reception starting point.",
                  "Follow the path until the arrival banner appears.",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-xs font-bold flex-shrink-0 mt-0.5 w-4" style={{ color: "#1e4a28" }}>{i + 1}.</span>
                    <p className="text-xs leading-relaxed" style={{ color: "#6b7c6e" }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
