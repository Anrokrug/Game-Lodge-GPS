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
  Map,
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
  const [propertyName, setPropertyName] = useState("My Property")
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    setHouses(getHouses())
    setPropertyName(getConfig().propertyName || "My Property")
  }, [])

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
        setGpsError("GPS error: " + err.message + ". Please allow location access.")
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

  // Check arrival — within ~50m of destination
  useEffect(() => {
    if (!currentPosition || !selectedHouse || arrived) return
    const dest = selectedHouse.path[selectedHouse.path.length - 1]
    if (!dest) return
    const dist = Math.sqrt(
      Math.pow((currentPosition.lat - dest.lat) * 111320, 2) +
        Math.pow(
          (currentPosition.lng - dest.lng) * 111320 * Math.cos((currentPosition.lat * Math.PI) / 180),
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

  const [receptionPoint, setReceptionPoint] = useState<LatLng | null>(null)

  useEffect(() => {
    setReceptionPoint(getConfig().receptionPoint)
  }, [screen])

  const handleBack = () => {
    stopGPS()
    setScreen("select")
    setSelectedHouse(null)
    setArrived(false)
    setGpsError("")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-nav-bg text-nav-text shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          {screen === "navigate" && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">{propertyName}</h1>
            <p className="text-xs opacity-60">
              {screen === "navigate" && selectedHouse
                ? `Navigating to ${selectedHouse.name}`
                : "Choose your destination"}
            </p>
          </div>
          <a
            href="/admin"
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            Admin
          </a>
        </div>
      </header>

      {/* HOUSE SELECTION SCREEN */}
      {screen === "select" && (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-3">
              <Map className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Where are you going?</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Select a house below and we will guide you there
            </p>
          </div>

          {houses.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">No houses configured yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
                The property owner needs to add house paths via the admin panel first.
              </p>
              <a
                href="/admin"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
              >
                Go to Admin
              </a>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {houses.map((house) => (
                <button
                  key={house.id}
                  onClick={() => handleSelectHouse(house)}
                  className="group text-left bg-card hover:bg-primary/5 border border-border hover:border-primary/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Home className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-card-foreground text-lg leading-tight">
                        {house.name}
                      </h3>
                      {house.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {house.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {house.path.length} waypoints recorded
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      )}

      {/* NAVIGATION SCREEN */}
      {screen === "navigate" && selectedHouse && (
        <div className="flex-1 flex flex-col">
          {/* Status bar */}
          <div className="bg-card border-b border-border px-4 py-3">
            <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${gpsReady ? "bg-success animate-pulse" : gpsLoading ? "bg-warning animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-sm font-medium text-foreground">
                  {gpsReady ? "GPS Active — Map following you" : gpsLoading ? "Getting GPS fix..." : "GPS inactive"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!gpsReady && !gpsLoading && (
                  <button
                    onClick={startGPS}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all"
                  >
                    <Locate className="w-3 h-3" />
                    Enable GPS
                  </button>
                )}
                {currentPosition && (
                  <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                    {currentPosition.lat.toFixed(5)}, {currentPosition.lng.toFixed(5)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* GPS Error */}
          {gpsError && (
            <div className="mx-4 mt-3 max-w-4xl mx-auto">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">GPS Error</p>
                  <p className="text-xs text-destructive/80 mt-0.5">{gpsError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Arrived banner */}
          {arrived && (
            <div className="mx-4 mt-3">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-success/10 border border-success/30 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-success flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-success-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">You have arrived!</p>
                  <p className="text-sm text-muted-foreground">
                    Welcome to <strong>{selectedHouse.name}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Route info strip */}
          <div className="px-4 py-2 max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary border-2 border-white shadow" />
                <span className="text-muted-foreground text-xs">Reception</span>
              </div>
              <div className="flex-1 h-px bg-border relative">
                <Navigation className="w-3 h-3 text-accent absolute left-1/2 -translate-x-1/2 -top-1.5" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-accent border-2 border-white shadow" />
                <span className="text-muted-foreground text-xs font-medium">{selectedHouse.name}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 px-4 pb-4">
            <div className="h-full min-h-[450px] rounded-2xl border border-border overflow-hidden shadow-sm">
              {receptionPoint ? (
                <ClientMap
                  path={selectedHouse.path}
                  receptionPoint={receptionPoint}
                  currentPosition={currentPosition}
                  destinationName={selectedHouse.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No reception point configured. Contact the property owner.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions panel */}
          <div className="px-4 pb-6 max-w-4xl w-full mx-auto">
            <div className="bg-card rounded-2xl border border-border p-4">
              <h3 className="font-semibold text-foreground mb-2 text-sm">How to navigate</h3>
              <ul className="space-y-1.5">
                {[
                  "The green line on the map shows the road to your destination.",
                  "The blue dot is your current position — the map follows you as you drive.",
                  "The green R marker is Reception where the route starts.",
                  "Follow the green path until you reach your destination.",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer on select screen */}
      {screen === "select" && (
        <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
          Property Navigator — GPS guided routes
        </footer>
      )}
    </div>
  )
}
