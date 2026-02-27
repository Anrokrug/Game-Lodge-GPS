"use client"

import { useEffect, useRef, useCallback } from "react"
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
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script")
      script.id = "leaflet-js"
      script.src = "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"
      script.crossOrigin = "anonymous"
      script.onload = () => resolve((window as any).L)
      document.head.appendChild(script)
    } else {
      const wait = setInterval(() => {
        if ((window as any).L) { clearInterval(wait); resolve((window as any).L) }
      }, 50)
    }
  })
}

function getUserLocation(): Promise<[number, number] | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000 }
    )
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
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const receptionMarkerRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const pathPolylineRef = useRef<any>(null)
  const initializedRef = useRef(false)
  // Keep latest callback in a ref so the map click always uses the current version
  const onReceptionSetRef = useRef(onReceptionSet)
  useEffect(() => { onReceptionSetRef.current = onReceptionSet }, [onReceptionSet])

  const initMap = useCallback(async () => {
    if (!mapRef.current || initializedRef.current) return
    initializedRef.current = true

    const [L, gpsPos] = await Promise.all([loadLeaflet(), getUserLocation()])
    if (!mapRef.current) return

    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
    })

    // Priority: receptionPoint → GPS → recorded path → fallback
    let center: [number, number]
    let zoom = 17
    if (receptionPoint) {
      center = [receptionPoint.lat, receptionPoint.lng]
    } else if (gpsPos) {
      center = gpsPos
    } else if (recordedPath.length > 0) {
      center = [recordedPath[0].lat, recordedPath[0].lng]
    } else {
      center = [-24.3, 27.5] // Limpopo area (Zebula region)
      zoom = 13
    }

    const m = L.map(mapRef.current, { center, zoom, zoomControl: true })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 22,
    }).addTo(m)

    mapInstanceRef.current = m

    // Wait until container has real pixel dimensions before invalidating
    const ensureSize = () => {
      if (mapRef.current && mapRef.current.offsetHeight > 10) {
        m.invalidateSize({ animate: false })
      } else {
        requestAnimationFrame(ensureSize)
      }
    }
    requestAnimationFrame(ensureSize)

    // Reception marker
    if (receptionPoint) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#1e4a28;border:3px solid #fff;border-radius:50%;width:24px;height:24px;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:11px;font-weight:800;">R</span></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      })
      receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], { icon })
        .addTo(m).bindPopup("<strong>Reception</strong>")
    }

    // GPS dot for current position
    if (currentPosition) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 5px rgba(59,130,246,0.3);"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      })
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon }).addTo(m)
    }

    // Existing path
    if (recordedPath.length > 1) {
      const coords = recordedPath.map((p) => [p.lat, p.lng])
      pathPolylineRef.current = L.polyline(coords, { color: "#c47c2a", weight: 5, opacity: 0.9 }).addTo(m)
      m.fitBounds(pathPolylineRef.current.getBounds(), { padding: [40, 40] })
    }

    // Click to set reception — always calls the latest callback via ref
    if (mode === "reception") {
      m.on("click", (e: any) => {
        if (onReceptionSetRef.current) {
          onReceptionSetRef.current({ lat: e.latlng.lat, lng: e.latlng.lng })
        }
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initMap()
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        initializedRef.current = false
      }
    }
  }, [initMap])



  // Update reception marker live
  useEffect(() => {
    const m = mapInstanceRef.current
    const L = (window as any).L
    if (!m || !L) return
    if (receptionMarkerRef.current) { receptionMarkerRef.current.remove(); receptionMarkerRef.current = null }
    if (receptionPoint) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#1e4a28;border:3px solid #fff;border-radius:50%;width:24px;height:24px;box-shadow:0 2px 8px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:11px;font-weight:800;">R</span></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      })
      receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], { icon })
        .addTo(m).bindPopup("<strong>Reception</strong>")
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
      const coords = recordedPath.map((p) => [p.lat, p.lng])
      pathPolylineRef.current = L.polyline(coords, {
        color: "#c47c2a", weight: 5, opacity: 0.9,
        dashArray: isRecording ? "10,6" : undefined,
      }).addTo(m)
    }
  }, [recordedPath, isRecording])

  // Follow current GPS position
  useEffect(() => {
    const m = mapInstanceRef.current
    const L = (window as any).L
    if (!m || !L || !currentPosition) return
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 5px rgba(59,130,246,0.3);"></div>`,
        iconSize: [18, 18], iconAnchor: [9, 9],
      })
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon }).addTo(m)
    }
    if (isRecording) {
      m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17), { animate: true, duration: 0.5 })
    }
  }, [currentPosition, isRecording])

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  )
}
