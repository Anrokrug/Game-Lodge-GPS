"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { LatLng } from "@/lib/storage"

interface AdminMapProps {
  mode: "reception" | "record"
  receptionPoint?: LatLng | null
  onReceptionSet?: (latlng: LatLng) => void
  recordedPath?: LatLng[]
  currentPosition?: LatLng | null
  isRecording?: boolean
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return
    if ((window as any).L) { resolve((window as any).L); return }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
      link.crossOrigin = "anonymous"
      document.head.appendChild(link)
    }
    const existing = document.getElementById("leaflet-js")
    if (existing) {
      const wait = setInterval(() => {
        if ((window as any).L) { clearInterval(wait); resolve((window as any).L) }
      }, 50)
      return
    }
    const script = document.createElement("script")
    script.id = "leaflet-js"
    script.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
    script.crossOrigin = "anonymous"
    script.onload = () => resolve((window as any).L)
    document.head.appendChild(script)
  })
}

export default function AdminMap({
  mode,
  receptionPoint,
  onReceptionSet,
  recordedPath = [],
  currentPosition,
  isRecording,
}: AdminMapProps) {
  const [mounted, setMounted] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const receptionMarkerRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const pathPolylineRef = useRef<any>(null)

  // Always keep the latest callback in a ref — avoids ALL stale closure issues
  const onReceptionSetRef = useRef(onReceptionSet)
  useEffect(() => { onReceptionSetRef.current = onReceptionSet }, [onReceptionSet])

  useEffect(() => { setMounted(true) }, [])

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return

    const L = await loadLeaflet()
    if (!mapRef.current || mapInstanceRef.current) return

    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
    })

    // Center: receptionPoint → recorded path → Zebula fallback
    let center: [number, number] = [-24.3, 27.5]
    let zoom = 15
    if (receptionPoint) {
      center = [receptionPoint.lat, receptionPoint.lng]; zoom = 17
    } else if (recordedPath.length > 0) {
      center = [recordedPath[0].lat, recordedPath[0].lng]; zoom = 17
    }

    const m = L.map(mapRef.current, { center, zoom, zoomControl: true })
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 22,
    }).addTo(m)

    mapInstanceRef.current = m

    // Invalidate size after container is painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        m.invalidateSize({ animate: false })
      })
    })

    // Place reception marker
    if (receptionPoint) {
      receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#1e4a28;border:3px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4)"><span style="color:#fff;font-size:10px;font-weight:800">R</span></div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        })
      }).addTo(m).bindPopup("<strong>Reception</strong>")
    }

    // Place GPS dot
    if (currentPosition) {
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 5px rgba(59,130,246,0.3)"></div>`,
          iconSize: [18, 18], iconAnchor: [9, 9],
        })
      }).addTo(m)
    }

    // Draw recorded path
    if (recordedPath.length > 1) {
      const coords = recordedPath.map((p) => [p.lat, p.lng])
      pathPolylineRef.current = L.polyline(coords, { color: "#c47c2a", weight: 5, opacity: 0.9 }).addTo(m)
      m.fitBounds(pathPolylineRef.current.getBounds(), { padding: [40, 40] })
    }

    // Reception tap handler — uses ref so it ALWAYS calls the latest callback
    if (mode === "reception") {
      m.on("click", (e: any) => {
        const latlng: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng }
        console.log("[v0] AdminMap click, ref:", !!onReceptionSetRef.current, "latlng:", latlng)
        if (onReceptionSetRef.current) onReceptionSetRef.current(latlng)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Init map after mount
  useEffect(() => {
    if (!mounted) return
    initMap()
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        receptionMarkerRef.current = null
        currentMarkerRef.current = null
        pathPolylineRef.current = null
      }
    }
  }, [mounted, initMap])

  // Update reception marker live when receptionPoint prop changes
  useEffect(() => {
    const m = mapInstanceRef.current
    const L = (window as any).L
    if (!m || !L) return
    if (receptionMarkerRef.current) { receptionMarkerRef.current.remove(); receptionMarkerRef.current = null }
    if (receptionPoint) {
      receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#1e4a28;border:3px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4)"><span style="color:#fff;font-size:10px;font-weight:800">R</span></div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        })
      }).addTo(m).bindPopup("<strong>Reception</strong>")
      m.setView([receptionPoint.lat, receptionPoint.lng], Math.max(m.getZoom(), 17))
    }
  }, [receptionPoint])

  // Update path polyline live
  useEffect(() => {
    const m = mapInstanceRef.current
    const L = (window as any).L
    if (!m || !L) return
    if (pathPolylineRef.current) { pathPolylineRef.current.remove(); pathPolylineRef.current = null }
    if (recordedPath.length > 1) {
      pathPolylineRef.current = L.polyline(recordedPath.map((p) => [p.lat, p.lng]), {
        color: "#c47c2a", weight: 5, opacity: 0.9,
        dashArray: isRecording ? "10,6" : undefined,
      }).addTo(m)
    }
  }, [recordedPath, isRecording])

  // Follow current GPS dot live
  useEffect(() => {
    const m = mapInstanceRef.current
    const L = (window as any).L
    if (!m || !L || !currentPosition) return
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
    } else {
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 5px rgba(59,130,246,0.3)"></div>`,
          iconSize: [18, 18], iconAnchor: [9, 9],
        })
      }).addTo(m)
    }
    if (isRecording) {
      m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17), { animate: true, duration: 0.5 })
    }
  }, [currentPosition, isRecording])

  // Use GPS button handler exposed via "Use My Location" — center map on location
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || !currentPosition) return
    if (mode === "reception" && !isRecording) {
      m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17))
    }
  }, [currentPosition, mode, isRecording])

  if (!mounted) return <div style={{ width: "100%", height: "100%", background: "#e8e6e0", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 13, color: "#6b7c6e" }}>Loading map…</span></div>

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  )
}
