"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { fetchHouses, fetchConfig, type House, type LatLng } from "@/lib/api"
import { MapPin, Home, Navigation, ArrowLeft, CheckCircle, AlertCircle, Locate, ChevronRight, Map, Loader2 } from "lucide-react"

const ClientMap = dynamic(() => import("@/components/ClientMap"), { ssr: false })

const SERIF = "'Playfair Display', Georgia, serif"
const SANS = "'Inter', system-ui, sans-serif"
const PROPERTY_NAME = "Zebula Golf Estate & Spa"

type Screen = "select" | "navigate"

export default function ClientPage() {
  const [houses, setHouses] = useState<House[]>([])
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState<Screen>("select")
  const [selectedHouse, setSelectedHouse] = useState<House | null>(null)
  const [currentPosition, setCurrentPosition] = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState("")
  const [gpsReady, setGpsReady] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [arrived, setArrived] = useState(false)
  const [receptionPoint, setReceptionPoint] = useState<LatLng | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [h, cfg] = await Promise.all([fetchHouses(), fetchConfig()])
      setHouses(h)
      setReceptionPoint(cfg.receptionPoint)
      setLoading(false)
    }
    load()
  }, [])

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
        setGpsError("Location error: " + err.message)
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f7f5f0", fontFamily: SANS }}>

      {/* HEADER */}
      <header style={{ backgroundColor: "#122918", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          {screen === "navigate" && (
            <button
              onClick={handleBack}
              aria-label="Back"
              style={{
                width: 32, height: 32, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", cursor: "pointer",
                color: "rgba(240,237,230,0.8)", flexShrink: 0,
              }}
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div style={{
            width: 30, height: 30, borderRadius: 6, backgroundColor: "#c47c2a",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <MapPin size={14} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#f0ede6", fontFamily: SERIF, fontSize: 15, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {PROPERTY_NAME}
            </p>
            <p style={{ color: "rgba(240,237,230,0.45)", fontSize: 10, marginTop: 3, letterSpacing: "0.1em", lineHeight: 1 }}>
              {screen === "navigate" && selectedHouse ? selectedHouse.name.toUpperCase() : "GUEST NAVIGATION"}
            </p>
          </div>
          <a href="/admin" style={{
            flexShrink: 0, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.2)", color: "rgba(240,237,230,0.7)", textDecoration: "none",
            fontFamily: SANS,
          }}>
            Admin
          </a>
        </div>
      </header>

      {/* HOUSE SELECTION */}
      {screen === "select" && (
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* Hero */}
          <section style={{ backgroundColor: "#122918" }}>
            <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 52px" }}>
              <p style={{ color: "rgba(240,237,230,0.45)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", marginBottom: 14 }}>
                WELCOME TO ZEBULA GOLF ESTATE &amp; SPA
              </p>
              <h1 style={{ fontFamily: SERIF, fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800, color: "#f0ede6", lineHeight: 1.15, marginBottom: 14 }}>
                Where would you<br />like to go?
              </h1>
              <p style={{ color: "rgba(240,237,230,0.55)", fontSize: 14, lineHeight: 1.7, maxWidth: 400 }}>
                Select your destination and we will guide you along the recorded road to get there.
              </p>
            </div>
            <svg viewBox="0 0 1440 40" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 40 }}>
              <path d="M0,40 C480,0 960,0 1440,40 L1440,40 L0,40 Z" fill="#f7f5f0" />
            </svg>
          </section>

          {/* Cards */}
          <section style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "32px 16px" }}>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 16 }}>
                <Loader2 size={32} color="#1e4a28" style={{ animation: "spin 1s linear infinite" }} />
                <p style={{ fontSize: 14, color: "#6b7c6e" }}>Loading destinations…</p>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : houses.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid #dddbd4", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Home size={28} color="#6b7c6e" />
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "#1a2a1e", marginBottom: 8 }}>No destinations yet</h2>
                <p style={{ color: "#6b7c6e", fontSize: 14, lineHeight: 1.6, maxWidth: 280, marginBottom: 24 }}>
                  The property owner needs to record paths via the admin panel.
                </p>
                <a href="/admin" style={{
                  padding: "10px 22px", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none",
                  backgroundColor: "#1e4a28", color: "#f7f5f0", fontFamily: SANS,
                }}>
                  Open Admin Panel
                </a>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {houses.map((house, i) => (
                  <button
                    key={house.id}
                    onClick={() => handleSelectHouse(house)}
                    style={{
                      textAlign: "left", borderRadius: 10, padding: 20, backgroundColor: "#ffffff",
                      border: "1px solid #dddbd4", cursor: "pointer", fontFamily: SANS,
                      transition: "box-shadow 0.15s, transform 0.15s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)" }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = "none" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em" }}>
                        PLOT {String(i + 1).padStart(2, "0")}
                      </span>
                      <div style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid #dddbd4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ChevronRight size={13} color="#6b7c6e" />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "rgba(30,74,40,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Home size={20} color="#1e4a28" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#1a2a1e", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {house.name}
                        </h3>
                        {house.description && (
                          <p style={{ fontSize: 12, color: "#6b7c6e", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {house.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ paddingTop: 12, borderTop: "1px solid #f0ede6", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#236b30" }} />
                      <span style={{ fontSize: 11, color: "#6b7c6e" }}>{house.path.length} waypoints &mdash; route ready</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <footer style={{ borderTop: "1px solid #dddbd4", padding: "16px 0", textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#6b7c6e", letterSpacing: "0.1em" }}>
              ZEBULA GOLF ESTATE &amp; SPA &nbsp;&mdash;&nbsp; GPS GUIDED ROUTES
            </p>
            <p style={{ fontSize: 10, color: "#9cad9f", marginTop: 4, letterSpacing: "0.06em" }}>
              Developed by Anro Kruger
            </p>
          </footer>
        </main>
      )}

      {/* NAVIGATE SCREEN */}
      {screen === "navigate" && selectedHouse && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* GPS status bar */}
          <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #dddbd4", padding: "10px 16px" }}>
            <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0, display: "inline-block",
                  backgroundColor: gpsReady ? "#236b30" : gpsLoading ? "#c47c2a" : "#9ca3af",
                }} />
                <span style={{ fontSize: 13, color: "#1a2a1e" }}>
                  {gpsReady ? "Live GPS active — map is following you" : gpsLoading ? "Acquiring GPS signal…" : "GPS not active"}
                </span>
              </div>
              {!gpsReady && !gpsLoading && (
                <button
                  onClick={startGPS}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6,
                    fontSize: 12, fontWeight: 600, backgroundColor: "#1e4a28", color: "#f7f5f0",
                    border: "none", cursor: "pointer", fontFamily: SANS, flexShrink: 0,
                  }}
                >
                  <Locate size={13} />
                  Enable GPS
                </button>
              )}
            </div>
          </div>

          {/* Alerts */}
          {(gpsError || arrived) && (
            <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "12px 16px 0" }}>
              {gpsError && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 8,
                  backgroundColor: "rgba(176,58,46,0.07)", border: "1px solid rgba(176,58,46,0.2)", marginBottom: 8,
                }}>
                  <AlertCircle size={16} color="#b03a2e" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: "#b03a2e", lineHeight: 1.5 }}>{gpsError}</p>
                </div>
              )}
              {arrived && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 8,
                  backgroundColor: "rgba(35,107,48,0.08)", border: "1px solid rgba(35,107,48,0.22)", marginBottom: 8,
                }}>
                  <CheckCircle size={22} color="#236b30" style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 700, color: "#1a2a1e" }}>You have arrived!</p>
                    <p style={{ fontSize: 13, color: "#6b7c6e", marginTop: 2 }}>Welcome to <strong style={{ color: "#1a2a1e" }}>{selectedHouse.name}</strong></p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Route breadcrumb */}
          <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "10px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7c6e" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#1e4a28", border: "2px solid #fff", boxShadow: "0 0 0 1px #1e4a28" }} />
                <span>Reception</span>
              </div>
              <div style={{ flex: 1, borderTop: "2px dashed #dddbd4" }} />
              <Navigation size={12} color="#c47c2a" />
              <div style={{ flex: 1, borderTop: "2px dashed #dddbd4" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#c47c2a", border: "2px solid #fff", boxShadow: "0 0 0 1px #c47c2a" }} />
                <span style={{ fontWeight: 600, color: "#1a2a1e" }}>{selectedHouse.name}</span>
              </div>
            </div>
          </div>

          {/* Map */}
          <div style={{ flex: 1, padding: "12px 16px 16px", maxWidth: 900, width: "100%", margin: "0 auto" }}>
            <div style={{ height: "100%", minHeight: 420, borderRadius: 10, overflow: "hidden", border: "1px solid #dddbd4", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
              {receptionPoint ? (
                <ClientMap
                  path={selectedHouse.path}
                  receptionPoint={receptionPoint}
                  currentPosition={currentPosition}
                  destinationName={selectedHouse.name}
                />
              ) : (
                <div style={{ height: "100%", minHeight: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#eceae4" }}>
                  <Map size={36} color="#6b7c6e" />
                  <p style={{ fontSize: 13, color: "#6b7c6e", marginTop: 12 }}>No reception point set. Contact the property owner.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tips */}
          <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", padding: "0 16px 24px" }}>
            <div style={{ borderRadius: 10, padding: 18, backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.1em", marginBottom: 14 }}>HOW TO FOLLOW THE ROUTE</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px 24px" }}>
                {[
                  "The green line shows the recorded road to your destination.",
                  "Your live position shows as a blue dot on the map.",
                  "The green R marker shows the Reception start point.",
                  "Follow the path — an arrival banner shows when you are there.",
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1e4a28", minWidth: 16, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <p style={{ fontSize: 12, color: "#6b7c6e", lineHeight: 1.6 }}>{tip}</p>
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
