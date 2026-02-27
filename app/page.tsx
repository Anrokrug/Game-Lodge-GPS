"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { getHouses, getConfig, type House, type LatLng } from "@/lib/storage"
import {
  MapPin, Home, Navigation, ArrowLeft, CheckCircle,
  AlertCircle, Locate, ChevronRight, Map,
} from "lucide-react"

const ClientMap = dynamic(() => import("@/components/ClientMap"), { ssr: false })

type Screen = "select" | "navigate"

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f7f5f0" }}>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ backgroundColor: "#122918" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          {screen === "navigate" && (
            <button
              onClick={handleBack}
              aria-label="Back"
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ color: "rgba(240,237,230,0.7)", background: "rgba(255,255,255,0.08)" }}
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#c47c2a" }}>
            <MapPin size={14} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold leading-none truncate"
              style={{ color: "#f0ede6", fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)" }}
            >
              {propertyName}
            </p>
            <p className="text-xs mt-0.5 leading-none" style={{ color: "rgba(240,237,230,0.45)", letterSpacing: "0.1em" }}>
              {screen === "navigate" && selectedHouse ? selectedHouse.name.toUpperCase() : "GUEST NAVIGATION"}
            </p>
          </div>
          <a
            href="/admin"
            className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{ border: "1px solid rgba(255,255,255,0.18)", color: "rgba(240,237,230,0.65)" }}
          >
            Admin
          </a>
        </div>
      </header>

      {/* ── HOUSE SELECTION SCREEN ── */}
      {screen === "select" && (
        <main className="flex-1 flex flex-col">

          {/* Hero banner */}
          <section style={{ backgroundColor: "#122918" }}>
            <div className="max-w-5xl mx-auto px-5 pt-10 pb-12">
              <p
                className="text-xs font-medium mb-3"
                style={{ color: "rgba(240,237,230,0.45)", letterSpacing: "0.14em" }}
              >
                WELCOME
              </p>
              <h1
                className="text-4xl md:text-5xl font-bold leading-tight mb-3"
                style={{
                  color: "#f0ede6",
                  fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
                }}
              >
                Where would you<br />like to go?
              </h1>
              <p className="text-sm leading-relaxed max-w-md" style={{ color: "rgba(240,237,230,0.55)" }}>
                Select a destination below and we will guide you along the recorded road.
              </p>
            </div>
            {/* SVG wave transition */}
            <svg viewBox="0 0 1440 48" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", height: 48 }} preserveAspectRatio="none">
              <path d="M0,48 C480,0 960,0 1440,48 L1440,48 L0,48 Z" fill="#f7f5f0" />
            </svg>
          </section>

          {/* House cards */}
          <section className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
            {houses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ border: "2px solid #dddbd4" }}
                >
                  <Home size={28} style={{ color: "#6b7c6e" }} />
                </div>
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", color: "#1a2a1e" }}
                >
                  No destinations yet
                </h2>
                <p className="text-sm leading-relaxed max-w-xs mb-6" style={{ color: "#6b7c6e" }}>
                  The property owner needs to record paths using the admin panel first.
                </p>
                <a
                  href="/admin"
                  className="px-5 py-2.5 rounded text-sm font-medium"
                  style={{ backgroundColor: "#1e4a28", color: "#f7f5f0" }}
                >
                  Open Admin Panel
                </a>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {houses.map((house, i) => (
                  <button
                    key={house.id}
                    onClick={() => handleSelectHouse(house)}
                    className="group text-left rounded-lg p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                    style={{ backgroundColor: "#ffffff", border: "1px solid #dddbd4" }}
                  >
                    {/* Card top row */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}
                      >
                        PLOT {String(i + 1).padStart(2, "0")}
                      </span>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                        style={{ border: "1px solid #dddbd4" }}
                      >
                        <ChevronRight size={14} style={{ color: "#6b7c6e" }} />
                      </div>
                    </div>

                    {/* Icon + name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "rgba(30,74,40,0.09)" }}
                      >
                        <Home size={20} style={{ color: "#1e4a28" }} />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className="font-bold text-lg leading-tight truncate"
                          style={{
                            color: "#1a2a1e",
                            fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)",
                          }}
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

                    {/* Footer */}
                    <div
                      className="flex items-center gap-2 pt-3"
                      style={{ borderTop: "1px solid #f0ede6" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#236b30" }} />
                      <span className="text-xs" style={{ color: "#6b7c6e" }}>
                        {house.path.length} waypoints &mdash; route ready
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <footer className="py-5 text-center" style={{ borderTop: "1px solid #dddbd4" }}>
            <p className="text-xs" style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}>
              {propertyName.toUpperCase()} &nbsp;&mdash;&nbsp; GPS GUIDED ROUTES
            </p>
          </footer>
        </main>
      )}

      {/* ── NAVIGATION SCREEN ── */}
      {screen === "navigate" && selectedHouse && (
        <div className="flex-1 flex flex-col">

          {/* GPS status bar */}
          <div className="px-4 py-2.5" style={{ backgroundColor: "#fff", borderBottom: "1px solid #dddbd4" }}>
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: gpsReady ? "#236b30" : gpsLoading ? "#c47c2a" : "#9ca3af",
                  }}
                />
                <span className="text-sm" style={{ color: "#1a2a1e" }}>
                  {gpsReady
                    ? "Live GPS — map is following you"
                    : gpsLoading
                    ? "Acquiring GPS signal…"
                    : "GPS not active"}
                </span>
              </div>
              {!gpsReady && !gpsLoading && (
                <button
                  onClick={startGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                  style={{ backgroundColor: "#1e4a28", color: "#f7f5f0" }}
                >
                  <Locate size={12} />
                  Enable GPS
                </button>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="max-w-5xl w-full mx-auto px-4 space-y-2 pt-3">
            {gpsError && (
              <div
                className="flex items-start gap-2.5 p-3 rounded-md"
                style={{ backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)" }}
              >
                <AlertCircle size={16} style={{ color: "#b03a2e", flexShrink: 0, marginTop: 1 }} />
                <p className="text-sm leading-relaxed" style={{ color: "#b03a2e" }}>{gpsError}</p>
              </div>
            )}
            {arrived && (
              <div
                className="flex items-center gap-3 p-4 rounded-md"
                style={{ backgroundColor: "rgba(35,107,48,0.07)", border: "1px solid rgba(35,107,48,0.2)" }}
              >
                <CheckCircle size={20} style={{ color: "#236b30", flexShrink: 0 }} />
                <div>
                  <p
                    className="font-semibold"
                    style={{ fontFamily: "var(--font-playfair, 'Playfair Display', Georgia, serif)", color: "#1a2a1e" }}
                  >
                    You have arrived!
                  </p>
                  <p className="text-sm" style={{ color: "#6b7c6e" }}>
                    Welcome to <strong style={{ color: "#1a2a1e" }}>{selectedHouse.name}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Route breadcrumb */}
          <div className="max-w-5xl w-full mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7c6e" }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: "#1e4a28" }} />
                <span>Reception</span>
              </div>
              <div className="flex-1 flex items-center gap-1 overflow-hidden">
                <div className="flex-1 border-t border-dashed" style={{ borderColor: "#dddbd4" }} />
                <Navigation size={11} style={{ color: "#c47c2a", flexShrink: 0 }} />
                <div className="flex-1 border-t border-dashed" style={{ borderColor: "#dddbd4" }} />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded border-2 border-white shadow-sm" style={{ backgroundColor: "#c47c2a" }} />
                <span className="font-medium" style={{ color: "#1a2a1e" }}>{selectedHouse.name}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 px-4 pb-4">
            <div
              className="h-full rounded-lg overflow-hidden shadow-sm"
              style={{ minHeight: 400, border: "1px solid #dddbd4" }}
            >
              {receptionPoint ? (
                <ClientMap
                  path={selectedHouse.path}
                  receptionPoint={receptionPoint}
                  currentPosition={currentPosition}
                  destinationName={selectedHouse.name}
                />
              ) : (
                <div
                  className="h-full flex flex-col items-center justify-center text-center px-6"
                  style={{ backgroundColor: "#eceae4", minHeight: 400 }}
                >
                  <Map size={36} style={{ color: "#6b7c6e", marginBottom: 12 }} />
                  <p className="text-sm" style={{ color: "#6b7c6e" }}>
                    No reception point set. Contact the property owner.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="px-4 pb-6 max-w-5xl w-full mx-auto">
            <div className="rounded-lg p-4" style={{ backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "#6b7c6e", letterSpacing: "0.1em" }}>
                HOW TO FOLLOW THE ROUTE
              </p>
              <div className="grid sm:grid-cols-2 gap-y-2 gap-x-6">
                {[
                  "The green line is the recorded road to your destination.",
                  "Your live position shows as a blue dot on the map.",
                  "The green R marker shows the Reception starting point.",
                  "Follow the path until the arrival banner appears.",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-bold mt-0.5 w-4 flex-shrink-0" style={{ color: "#1e4a28" }}>
                      {i + 1}.
                    </span>
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
