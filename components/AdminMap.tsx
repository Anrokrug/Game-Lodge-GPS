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

// Load Leaflet CSS + JS from CDN and return window.L
function loadLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return

    // Already loaded
    if ((window as any).L) {
      resolve((window as any).L)
      return
    }

    // Inject CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.crossOrigin = "anonymous"
      document.head.appendChild(link)
    }

    // Inject JS
    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script")
      script.id = "leaflet-js"
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.crossOrigin = "anonymous"
      script.onload = () => resolve((window as any).L)
      document.head.appendChild(script)
    } else {
      // Script tag exists but may still be loading
      const wait = setInterval(() => {
        if ((window as any).L) {
          clearInterval(wait)
          resolve((window as any).L)
        }
      }, 50)
    }
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

  const getDefaultCenter = useCallback((): [number, number] => {
    if (receptionPoint) return [receptionPoint.lat, receptionPoint.lng]
    if (currentPosition) return [currentPosition.lat, currentPosition.lng]
    if (recordedPath.length > 0) return [recordedPath[0].lat, recordedPath[0].lng]
    return [-29.0, 25.0]
  }, [receptionPoint, currentPosition, recordedPath])

  // Initialise map once
  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return
    initializedRef.current = true

    loadLeaflet().then((L) => {
      if (!mapRef.current) return

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const center = getDefaultCenter()
      const m = L.map(mapRef.current, { center, zoom: 16, zoomControl: true })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 22,
      }).addTo(m)

      mapInstanceRef.current = m

      // Reception marker
      if (receptionPoint) {
        const recIcon = L.divIcon({
          className: "",
          html: `<div style="background:#2d8a4e;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:10px;font-weight:bold;">R</span></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
        receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], { icon: recIcon })
          .addTo(m)
          .bindPopup("<strong>Reception</strong><br/>Starting point")
      }

      // Click handler for reception mode
      if (mode === "reception" && onReceptionSet) {
        m.on("click", (e: any) => {
          onReceptionSet({ lat: e.latlng.lat, lng: e.latlng.lng })
        })
      }

      // Draw existing path
      if (recordedPath.length > 0) {
        const latLngs = recordedPath.map((p) => [p.lat, p.lng])
        pathPolylineRef.current = L.polyline(latLngs, {
          color: "#e67e22",
          weight: 5,
          opacity: 0.9,
        }).addTo(m)
        m.fitBounds(pathPolylineRef.current.getBounds(), { padding: [30, 30] })
      }

      // Current position marker
      if (currentPosition) {
        const posIcon = L.divIcon({
          className: "",
          html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon: posIcon })
          .addTo(m)
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        initializedRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update click handler when mode/callback changes
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || mode !== "reception") return
    m.off("click")
    if (onReceptionSet) {
      m.on("click", (e: any) => {
        onReceptionSet({ lat: e.latlng.lat, lng: e.latlng.lng })
      })
    }
  }, [onReceptionSet, mode])

  // Update reception marker
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m) return
    const L = (window as any).L
    if (!L) return

    if (receptionMarkerRef.current) {
      receptionMarkerRef.current.remove()
      receptionMarkerRef.current = null
    }
    if (receptionPoint) {
      const recIcon = L.divIcon({
        className: "",
        html: `<div style="background:#2d8a4e;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:10px;font-weight:bold;">R</span></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })
      receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], { icon: recIcon })
        .addTo(m)
        .bindPopup("<strong>Reception</strong>")
      m.setView([receptionPoint.lat, receptionPoint.lng], Math.max(m.getZoom(), 16))
    }
  }, [receptionPoint])

  // Update path polyline
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m) return
    const L = (window as any).L
    if (!L) return

    if (pathPolylineRef.current) {
      pathPolylineRef.current.remove()
      pathPolylineRef.current = null
    }
    if (recordedPath.length > 1) {
      const latLngs = recordedPath.map((p) => [p.lat, p.lng])
      pathPolylineRef.current = L.polyline(latLngs, {
        color: "#e67e22",
        weight: 5,
        opacity: 0.9,
        dashArray: isRecording ? "10, 6" : undefined,
      }).addTo(m)
    }
  }, [recordedPath, isRecording])

  // Follow user position
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || !currentPosition) return
    const L = (window as any).L
    if (!L) return

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
    } else {
      const posIcon = L.divIcon({
        className: "",
        html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 4px rgba(59,130,246,0.3);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon: posIcon })
        .addTo(m)
    }

    if (isRecording) {
      m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17), { animate: true })
    }
  }, [currentPosition, isRecording])

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
}
