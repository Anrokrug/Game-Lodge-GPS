"use client"

import { useEffect, useRef } from "react"
import type { LatLng } from "@/lib/storage"

interface ClientMapProps {
  path: LatLng[]
  receptionPoint: LatLng
  currentPosition: LatLng | null
  destinationName: string
}

export default function ClientMap({
  path,
  receptionPoint,
  currentPosition,
  destinationName,
}: ClientMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null)
  const currentMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null)
  const accuracyCircleRef = useRef<ReturnType<typeof import("leaflet")["circle"]> | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return
    initializedRef.current = true

    const initMap = async () => {
      const L = (await import("leaflet")).default

      // @ts-expect-error
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const center: [number, number] =
        path.length > 0 ? [path[0].lat, path[0].lng] : [receptionPoint.lat, receptionPoint.lng]

      const m = L.map(mapRef.current!, {
        center,
        zoom: 16,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 22,
      }).addTo(m)

      mapInstanceRef.current = m

      // Draw the route path
      if (path.length > 1) {
        const latLngs = path.map((p) => [p.lat, p.lng] as [number, number])
        L.polyline(latLngs, {
          color: "#2d8a4e",
          weight: 6,
          opacity: 0.85,
        }).addTo(m)

        // Fit map to path
        m.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] })
      }

      // Reception start marker
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="background:#2d8a4e;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
          <div style="color:white;font-size:10px;font-weight:bold;line-height:1;">R</div>
        </div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })
      L.marker([receptionPoint.lat, receptionPoint.lng], { icon: startIcon })
        .addTo(m)
        .bindPopup("<strong>Reception</strong><br/>Start here")

      // Destination marker (last point in path)
      if (path.length > 0) {
        const dest = path[path.length - 1]
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#e67e22;border:3px solid white;border-radius:8px;padding:2px 6px;font-size:10px;font-weight:700;color:white;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${destinationName}</div>`,
          iconSize: [undefined as unknown as number, undefined as unknown as number],
          iconAnchor: [0, 24],
        })
        L.marker([dest.lat, dest.lng], { icon: destIcon })
          .addTo(m)
          .bindPopup(`<strong>${destinationName}</strong><br/>Your destination`)
      }
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        initializedRef.current = false
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update current position marker and follow
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || !currentPosition) return

    import("leaflet").then(({ default: L }) => {
      if (currentMarkerRef.current) {
        currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
        }
      } else {
        // Accuracy circle
        accuracyCircleRef.current = L.circle([currentPosition.lat, currentPosition.lng], {
          radius: 8,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(m)

        // Current position dot
        const posIcon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:0;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.35);"></div>
            <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;animation:ping 1.5s ease-in-out infinite;opacity:0.4;"></div>
          </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
        currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
          icon: posIcon,
          zIndexOffset: 1000,
        })
          .addTo(m)
          .bindPopup("You are here")
      }

      // Always pan to follow user
      m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17), {
        animate: true,
        duration: 0.5,
      })
    })
  }, [currentPosition])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin="anonymous"
      />
      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.4; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </>
  )
}
