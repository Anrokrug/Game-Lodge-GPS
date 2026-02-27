"use client"

import { useEffect, useRef } from "react"
import type { LatLng } from "@/lib/storage"

interface ClientMapProps {
  path: LatLng[]
  receptionPoint: LatLng
  currentPosition: LatLng | null
  destinationName: string
}

// Load Leaflet CSS + JS from CDN and return window.L
function loadLeaflet(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return

    if ((window as any).L) {
      resolve((window as any).L)
      return
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      link.crossOrigin = "anonymous"
      document.head.appendChild(link)
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script")
      script.id = "leaflet-js"
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.crossOrigin = "anonymous"
      script.onload = () => resolve((window as any).L)
      document.head.appendChild(script)
    } else {
      const wait = setInterval(() => {
        if ((window as any).L) {
          clearInterval(wait)
          resolve((window as any).L)
        }
      }, 50)
    }
  })
}

export default function ClientMap({
  path,
  receptionPoint,
  currentPosition,
  destinationName,
}: ClientMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const accuracyCircleRef = useRef<any>(null)
  const initializedRef = useRef(false)

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

      const center: [number, number] =
        path.length > 0
          ? [path[0].lat, path[0].lng]
          : [receptionPoint.lat, receptionPoint.lng]

      const m = L.map(mapRef.current, { center, zoom: 16, zoomControl: true })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 22,
      }).addTo(m)

      mapInstanceRef.current = m

      // Draw the recorded route
      if (path.length > 1) {
        const latLngs = path.map((p) => [p.lat, p.lng])
        const polyline = L.polyline(latLngs, {
          color: "#2d8a4e",
          weight: 7,
          opacity: 0.85,
        }).addTo(m)
        m.fitBounds(polyline.getBounds(), { padding: [50, 50] })
      }

      // Reception / start marker
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="background:#2d8a4e;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="color:white;font-size:10px;font-weight:bold;line-height:1;">R</span></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })
      L.marker([receptionPoint.lat, receptionPoint.lng], { icon: startIcon })
        .addTo(m)
        .bindPopup("<strong>Reception</strong><br/>Start here")

      // Destination marker
      if (path.length > 0) {
        const dest = path[path.length - 1]
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#e67e22;border:3px solid white;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:700;color:white;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${destinationName}</div>`,
          iconAnchor: [0, 30],
        })
        L.marker([dest.lat, dest.lng], { icon: destIcon })
          .addTo(m)
          .bindPopup(`<strong>${destinationName}</strong><br/>Your destination`)
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

  // Follow user on the map
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || !currentPosition) return
    const L = (window as any).L
    if (!L) return

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
      }
    } else {
      accuracyCircleRef.current = L.circle([currentPosition.lat, currentPosition.lng], {
        radius: 10,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(m)

      const posIcon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(59,130,246,0.35);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
      currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
        icon: posIcon,
        zIndexOffset: 1000,
      })
        .addTo(m)
        .bindPopup("You are here")
    }

    m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17), {
      animate: true,
      duration: 0.5,
    })
  }, [currentPosition])

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
}
