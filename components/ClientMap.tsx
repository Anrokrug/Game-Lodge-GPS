"use client"

import { useEffect, useRef } from "react"
import type { LatLng } from "@/lib/storage"

interface ClientMapProps {
  path: LatLng[]
  receptionPoint: LatLng
  currentPosition: LatLng | null
  destinationName: string
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

export default function ClientMap({ path, receptionPoint, currentPosition, destinationName }: ClientMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!mapDivRef.current || initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      const [L, gpsPos] = await Promise.all([loadLeaflet(), getUserLocation()])
      if (!mapDivRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      // Center priority: GPS position → reception point → first path point
      let center: [number, number]
      if (gpsPos) {
        center = gpsPos
      } else if (receptionPoint) {
        center = [receptionPoint.lat, receptionPoint.lng]
      } else if (path.length > 0) {
        center = [path[0].lat, path[0].lng]
      } else {
        center = [-24.3, 27.5]
      }

      const map = L.map(mapDivRef.current, { center, zoom: 16, zoomControl: true })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 22,
      }).addTo(map)

      mapInstanceRef.current = map

      // Wait until container has real pixel height before invalidating
      const ensureSize = () => {
        if (mapDivRef.current && mapDivRef.current.offsetHeight > 10) {
          map.invalidateSize({ animate: false })
        } else {
          requestAnimationFrame(ensureSize)
        }
      }
      requestAnimationFrame(ensureSize)

      // Draw route
      if (path.length > 1) {
        const coords: [number, number][] = path.map((p) => [p.lat, p.lng])
        const poly = L.polyline(coords, { color: "#1e4a28", weight: 7, opacity: 0.85 }).addTo(map)
        // Fit to route bounds so entire route is visible
        map.fitBounds(poly.getBounds(), { padding: [48, 48] })
      }

      // Reception / start marker
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="background:#1e4a28;border:3px solid #fff;border-radius:50%;width:26px;height:26px;box-shadow:0 2px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:11px;font-weight:800;">R</span></div>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      })
      L.marker([receptionPoint.lat, receptionPoint.lng], { icon: startIcon })
        .addTo(map).bindPopup("<strong>Reception</strong><br>Your starting point")

      // Destination marker
      if (path.length > 0) {
        const dest = path[path.length - 1]
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#c47c2a;color:#fff;border:2px solid #fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-family:system-ui,sans-serif;">${destinationName}</div>`,
          iconAnchor: [0, 32],
        })
        L.marker([dest.lat, dest.lng], { icon: destIcon })
          .addTo(map).bindPopup(`<strong>${destinationName}</strong>`)
      }

      // GPS dot for current position
      if (currentPosition) {
        const icon = L.divIcon({
          className: "",
          html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 0 0 6px rgba(59,130,246,0.28);"></div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        })
        currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon, zIndexOffset: 1000 })
          .addTo(map)
      }
    }

    init()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        initializedRef.current = false
        currentMarkerRef.current = null
      }
    }
  }, [path, receptionPoint, destinationName]) // re-init when house changes

  // Live GPS tracking
  useEffect(() => {
    const map = mapInstanceRef.current
    const L = (window as any).L
    if (!map || !L || !currentPosition) return

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
    } else {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:20px;height:20px;box-shadow:0 0 0 6px rgba(59,130,246,0.28);"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      })
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], { icon, zIndexOffset: 1000 })
        .addTo(map)
    }

    map.setView([currentPosition.lat, currentPosition.lng], Math.max(map.getZoom(), 17), {
      animate: true, duration: 0.5,
    })
  }, [currentPosition])

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapDivRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  )
}
