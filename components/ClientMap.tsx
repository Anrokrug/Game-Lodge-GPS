"use client"

import { useEffect, useRef } from "react"
import type { LatLng } from "@/lib/storage"

interface ClientMapProps {
  path: LatLng[]
  receptionPoint: LatLng
  currentPosition: LatLng | null
  destinationName: string
}

// Preload Leaflet assets — call this as early as possible
function injectLeafletAssets() {
  if (typeof window === "undefined") return
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
    document.head.appendChild(script)
  }
}

function waitForLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    if ((window as any).L) { resolve((window as any).L); return }
    const interval = setInterval(() => {
      if ((window as any).L) { clearInterval(interval); resolve((window as any).L) }
    }, 50)
  })
}

export default function ClientMap({ path, receptionPoint, currentPosition, destinationName }: ClientMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const initializedRef = useRef(false)

  // Kick off asset loading immediately on first render
  useEffect(() => { injectLeafletAssets() }, [])

  // Initialize map — re-runs if path/receptionPoint change (e.g. loaded after dynamic import)
  useEffect(() => {
    if (!mapDivRef.current) return
    if (initializedRef.current) return
    initializedRef.current = true

    waitForLeaflet().then((L) => {
      if (!mapDivRef.current || mapInstanceRef.current) return

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const startCenter: [number, number] = path.length > 0
        ? [path[0].lat, path[0].lng]
        : [receptionPoint.lat, receptionPoint.lng]

      const map = L.map(mapDivRef.current, {
        center: startCenter,
        zoom: 16,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 22,
      }).addTo(map)

      mapInstanceRef.current = map

      // Draw route polyline
      if (path.length > 1) {
        const coords: [number, number][] = path.map((p) => [p.lat, p.lng])
        const poly = L.polyline(coords, { color: "#2d8a4e", weight: 7, opacity: 0.88 }).addTo(map)
        map.fitBounds(poly.getBounds(), { padding: [48, 48] })
      }

      // Reception start marker
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="width:26px;height:26px;background:#1e4a28;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:11px;font-weight:800;line-height:1;">R</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })
      L.marker([receptionPoint.lat, receptionPoint.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup("<strong>Reception</strong><br>Your starting point")

      // Destination end marker
      if (path.length > 0) {
        const dest = path[path.length - 1]
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#c47c2a;color:#fff;border:2px solid #fff;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-family:system-ui,sans-serif;">${destinationName}</div>`,
          iconAnchor: [0, 32],
        })
        L.marker([dest.lat, dest.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<strong>${destinationName}</strong><br>Your destination`)
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        initializedRef.current = false
        currentMarkerRef.current = null
      }
    }
  // Only re-initialize if path or receptionPoint reference changes (new house selected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, receptionPoint, destinationName])

  // Live GPS — update position dot and pan map
  useEffect(() => {
    if (!mapInstanceRef.current || !currentPosition) return
    const L = (window as any).L
    if (!L) return
    const map = mapInstanceRef.current

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
    } else {
      const posIcon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.28);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: posIcon,
        zIndexOffset: 1000,
      }).addTo(map).bindPopup("You are here")
    }

    map.setView([currentPosition.lat, currentPosition.lng], Math.max(map.getZoom(), 17), {
      animate: true,
      duration: 0.6,
    })
  }, [currentPosition])

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
