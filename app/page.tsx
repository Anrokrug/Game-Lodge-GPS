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
    if (!navigator.geolocation) {
      setGpsError("GPS not available on this device.")
      return
    }
    setGpsLoading(true)
    setGpsError("")
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setCurrentPosition(point)
        setGpsReady(true)
        setGpsLoading(false)
      },
      (err) => {
        setGpsError("Location error: " + err.message + ". Please allow access.")
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
        Math.pow(
          (currentPosition.lng - dest.lng) *
            111320 *
            Math.cos((currentPosition.lat * Math.PI) / 180),
          2
        )
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
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── NAV BAR ── */}
      <header className="bg-hero-bg text-nav-text sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          {screen === "navigate" && (
            <button
              onClick={handleBack}
              className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-serif text-base font-semibold leading-tight truncate tracking-wide">
                {propertyName}
              </p>
              <p className="text-[11px] uppercase tracking-widest opacity-50 leading-tight">
                {screen === "navigate" && selectedHouse
                  ? selectedHouse.name
                  : "Guest Navigation"}
              </p>
            </div>
          </div>
          <a
            href="/admin"
            className="text-[11px] uppercase tracking-widest px-3 py-1.5 border border-white/20 rounded-sm hover:bg-white/10 transition-colors"
          >
            Admin
          </a>
        </div>
      </header>

      {/* ── HOUSE SELECTION ── */}
      {screen === "select" && (
        <main className="flex-1 flex flex-col">

          {/* Hero banner */}
          <div className="bg-hero-bg text-nav-text pb-10 pt-6 px-5">
            <div className="max-w-5xl mx-auto">
              <p className="text-[11px] uppercase tracking-widest opacity-50 mb-2">
                Welcome to {propertyName}
              </p>
              <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-balance">
                Where would you<br />like to go?
              </h1>
              <p className="mt-3 text-sm opacity-60 leading-relaxed max-w-sm">
                Select your destination below and we will guide you along the recorded route.
              </p>
            </div>
          </div>

          {/* Wave divider */}
          <div className="bg-hero-bg">
            <svg viewBox="0 0 1440 40" className="w-full block" preserveAspectRatio="none" style={{ height: 40 }}>
              <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="var(--background)" />
            </svg>
          </div>

          {/* House cards */}
          <div className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">
            {houses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center mb-5">
                  <Home className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">No destinations yet</h3>
                <p className="text-muted-foreground text-sm mt-2 max-w-xs leading-relaxed">
                  The property owner needs to record paths via the admin panel first.
                </p>
                <a
                  href="/admin"
                  className="mt-6 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-sm hover:opacity-90 transition-all"
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
                    className="group text-left bg-card border border-border hover:border-primary/40 hover:shadow-lg rounded-sm p-5 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
                        Plot {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="w-7 h-7 rounded-full border border-border group-hover:border-primary group-hover:bg-primary/5 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="w-10 h-10 bg-primary/8 rounded-sm flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif font-semibold text-lg text-card-foreground leading-tight text-balance">
                          {house.name}
                        </h3>
                        {house.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {house.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-[11px] text-muted-foreground">
                        {house.path.length} waypoints &mdash; route ready
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="border-t border-border py-4 text-center">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {propertyName} &mdash; GPS Guided Routes
            </p>
          </footer>
        </main>
      )}

      {/* ── NAVIGATION SCREEN ── */}
      {screen === "navigate" && selectedHouse && (
        <div className="flex-1 flex flex-col">

          {/* GPS status bar */}
          <div className="bg-card border-b border-border px-5 py-3">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    gpsReady
                      ? "bg-success animate-pulse"
                      : gpsLoading
                      ? "bg-warning animate-pulse"
                      : "bg-muted-foreground"
                  }`}
                />
                <span className="text-sm text-foreground font-medium">
                  {gpsReady
                    ? "Live GPS — map is following you"
                    : gpsLoading
                    ? "Acquiring GPS signal..."
                    : "GPS inactive"}
                </span>
              </div>
              {!gpsReady && !gpsLoading && (
                <button
                  onClick={startGPS}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-sm hover:opacity-90 transition-all"
                >
                  <Locate className="w-3 h-3" />
                  Enable GPS
                </button>
              )}
            </div>
          </div>

          {/* Error notice */}
          {gpsError && (
            <div className="mx-5 mt-3 max-w-5xl">
              <div className="flex items-start gap-2.5 p-3 bg-destructive/8 border border-destructive/20 rounded-sm">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive leading-relaxed">{gpsError}</p>
              </div>
            </div>
          )}

          {/* Arrived banner */}
          {arrived && (
            <div className="mx-5 mt-3 max-w-5xl">
              <div className="flex items-center gap-3 p-4 bg-success/8 border border-success/25 rounded-sm">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                  <p className="font-serif font-semibold text-foreground">You have arrived</p>
                  <p className="text-sm text-muted-foreground">
                    Welcome to <strong className="text-foreground">{selectedHouse.name}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Route strip */}
          <div className="px-5 py-3 max-w-5xl w-full mx-auto">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-sm" />
                <span>Reception</span>
              </div>
              <div className="flex-1 border-t border-dashed border-border relative">
                <Navigation className="w-3 h-3 text-accent absolute left-1/2 -translate-x-1/2 -top-1.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-accent border-2 border-white shadow-sm" />
                <span className="font-medium text-foreground">{selectedHouse.name}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 px-5 pb-5">
            <div className="h-full min-h-[420px] rounded-sm border border-border overflow-hidden shadow-sm">
              {receptionPoint ? (
                <ClientMap
                  path={selectedHouse.path}
                  receptionPoint={receptionPoint}
                  currentPosition={currentPosition}
                  destinationName={selectedHouse.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-muted/20">
                  <div className="text-center px-6">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      No reception point has been set. Please contact the property owner.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* How-to strip */}
          <div className="px-5 pb-6 max-w-5xl w-full mx-auto">
            <div className="bg-card border border-border rounded-sm p-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
                How to follow the route
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  "The green line is the recorded road to your destination.",
                  "Your live position is the blue dot — the map follows you.",
                  "The green R marker shows the Reception starting point.",
                  "Follow the path until the arrival banner appears.",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[11px] font-bold text-primary flex-shrink-0 mt-0.5 w-4">
                      {i + 1}.
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
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
