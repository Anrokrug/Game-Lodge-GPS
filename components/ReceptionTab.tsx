"use client"

import { useState } from "react"
import { MapPin, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react"
import { updateConfig, fetchConfig, type PropertyConfig, type LatLng } from "@/lib/api"

const SANS = "'Inter', system-ui, sans-serif"
const SERIF = "'Playfair Display', Georgia, serif"
const PRIMARY = "#1e4a28"
const SUCCESS = "#236b30"
const DESTRUCTIVE = "#b03a2e"
const AMBER = "#c47c2a"

interface Props {
  config: PropertyConfig | null
  onSave: (latlng: LatLng) => Promise<void>
}

export default function ReceptionTab({ config, onSave }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [saved, setSaved] = useState<LatLng | null>(config?.receptionPoint ?? null)
  const [showManual, setShowManual] = useState(false)
  const [manualLat, setManualLat] = useState("")
  const [manualLng, setManualLng] = useState("")

  const saveLocation = async (latlng: LatLng) => {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receptionPoint: latlng }),
    })
    if (!res.ok) throw new Error("Server error " + res.status)
    setSaved(latlng)
    setStatus("success")
    await onSave(latlng)
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("GPS not available. Use manual entry below.")
      setStatus("error")
      setShowManual(true)
      return
    }
    setStatus("loading")
    setErrorMsg("")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await saveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        } catch (e: any) {
          setErrorMsg("Failed to save: " + e.message)
          setStatus("error")
        }
      },
      (err) => {
        const isPolicy = err.message.toLowerCase().includes("permission") || err.message.toLowerCase().includes("policy")
        setErrorMsg(
          isPolicy
            ? "GPS blocked by browser policy. Open this page directly in your browser (not inside an app preview), or enter coordinates manually below."
            : "Could not get GPS: " + err.message
        )
        setStatus("error")
        setShowManual(true)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleManualSave = async () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) { setErrorMsg("Enter valid numbers for latitude and longitude."); setStatus("error"); return }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { setErrorMsg("Coordinates out of range."); setStatus("error"); return }
    setStatus("loading")
    try {
      await saveLocation({ lat, lng })
    } catch (e: any) {
      setErrorMsg("Failed to save: " + e.message)
      setStatus("error")
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 540 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7c6e", letterSpacing: "0.12em", marginBottom: 6, fontFamily: SANS }}>CONFIGURATION</p>
        <h2 style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: "#1a2a1e" }}>Reception Point</h2>
        <p style={{ fontSize: 13, color: "#6b7c6e", marginTop: 6, lineHeight: 1.7, fontFamily: SANS }}>
          This is where all guest routes start from. Drive to your reception / entrance gate and press the button below to save your current GPS location as the reception point.
        </p>
      </div>

      {/* Current saved point */}
      {saved ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px", borderRadius: 10, backgroundColor: "rgba(35,107,48,0.07)", border: "1px solid rgba(35,107,48,0.25)" }}>
          <CheckCircle size={20} color={SUCCESS} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a2a1e", fontFamily: SANS }}>Reception point is saved</p>
            <p style={{ fontSize: 12, color: "#6b7c6e", fontFamily: "monospace", marginTop: 4 }}>
              Lat: {saved.lat.toFixed(6)}<br />
              Lng: {saved.lng.toFixed(6)}
            </p>
            <p style={{ fontSize: 12, color: "#6b7c6e", marginTop: 6, fontFamily: SANS }}>
              Press the button below again to update it with a new location.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px", borderRadius: 10, backgroundColor: "#eceae4", border: "1px solid #dddbd4" }}>
          <AlertCircle size={20} color={AMBER} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a2a1e", fontFamily: SANS }}>No reception point set yet</p>
            <p style={{ fontSize: 12, color: "#6b7c6e", marginTop: 4, fontFamily: SANS }}>
              Drive to your reception entrance and press the button below.
            </p>
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleUseMyLocation}
        disabled={status === "loading"}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          padding: "18px 24px", borderRadius: 10, fontSize: 15, fontWeight: 700,
          fontFamily: SANS, letterSpacing: "0.04em", border: "none", cursor: status === "loading" ? "not-allowed" : "pointer",
          backgroundColor: status === "loading" ? "#4a7c56" : PRIMARY,
          color: "#fff", width: "100%", opacity: status === "loading" ? 0.85 : 1,
          boxShadow: "0 4px 14px rgba(30,74,40,0.25)",
        }}
      >
        {status === "loading" ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Getting your GPS location…
          </>
        ) : (
          <>
            <MapPin size={18} />
            {saved ? "Update Reception Location" : "Set Reception to My Current Location"}
          </>
        )}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Status messages */}
      {status === "success" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 10, backgroundColor: "rgba(35,107,48,0.09)", border: "1px solid rgba(35,107,48,0.3)" }}>
          <CheckCircle size={18} color={SUCCESS} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1a2a1e", fontFamily: SANS }}>
            Reception point saved successfully! All guest routes will now start from this location.
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 16px", borderRadius: 10, backgroundColor: "rgba(176,58,46,0.08)", border: "1px solid rgba(176,58,46,0.25)" }}>
          <AlertCircle size={18} color={DESTRUCTIVE} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: DESTRUCTIVE, fontFamily: SANS, lineHeight: 1.6 }}>{errorMsg}</p>
        </div>
      )}

      {/* Manual coordinate entry fallback */}
      {showManual && (
        <div style={{ padding: "20px", borderRadius: 10, backgroundColor: "#fff", border: "1.5px solid #dddbd4" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a2a1e", marginBottom: 4, fontFamily: SANS }}>Enter coordinates manually</p>
          <p style={{ fontSize: 12, color: "#6b7c6e", marginBottom: 16, fontFamily: SANS, lineHeight: 1.6 }}>
            Open <strong>Google Maps</strong> on your phone, long-press your reception location, and copy the coordinates shown at the top.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7c6e", letterSpacing: "0.1em", fontFamily: SANS }}>LATITUDE (e.g. -24.386744)</label>
              <input
                type="number"
                step="any"
                placeholder="-24.386744"
                value={manualLat}
                onChange={e => setManualLat(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #dddbd4", fontSize: 14, fontFamily: "monospace", color: "#1a2a1e", backgroundColor: "#fafaf8", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7c6e", letterSpacing: "0.1em", fontFamily: SANS }}>LONGITUDE (e.g. 27.801823)</label>
              <input
                type="number"
                step="any"
                placeholder="27.801823"
                value={manualLng}
                onChange={e => setManualLng(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #dddbd4", fontSize: 14, fontFamily: "monospace", color: "#1a2a1e", backgroundColor: "#fafaf8", boxSizing: "border-box" }}
              />
            </div>
            <button
              onClick={handleManualSave}
              disabled={!manualLat || !manualLng || status === "loading"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 700, fontFamily: SANS, border: "none", cursor: "pointer", backgroundColor: AMBER, color: "#fff", opacity: !manualLat || !manualLng ? 0.5 : 1 }}
            >
              <Save size={15} /> Save These Coordinates
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "16px", borderRadius: 10, backgroundColor: "#fff", border: "1px solid #dddbd4" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#1a2a1e", marginBottom: 6, fontFamily: SANS }}>How to set your reception point:</p>
        <ol style={{ paddingLeft: 18, margin: 0 }}>
          {["Drive your vehicle to the reception or main entrance gate.", "Make sure you have GPS signal (open sky).", "Press the button above — it will use your phone's GPS to save the exact location.", "All guest navigation will start from this saved point."].map((step, i) => (
            <li key={i} style={{ fontSize: 12, color: "#6b7c6e", lineHeight: 1.8, fontFamily: SANS }}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}
