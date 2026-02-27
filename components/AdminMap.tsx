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

export default function AdminMap({
  mode,
  receptionPoint,
  onReceptionSet,
  recordedPath = [],
  currentPosition,
  isRecording,
}: AdminMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<ReturnType<typeof import("leaflet")["map"]> | null>(null)
  const receptionMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null)
  const currentMarkerRef = useRef<ReturnType<typeof import("leaflet")["marker"]> | null>(null)
  const pathPolylineRef = useRef<ReturnType<typeof import("leaflet")["polyline"]> | null>(null)
  const initializedRef = useRef(false)

  const getDefaultCenter = useCallback((): [number, number] => {
    if (receptionPoint) return [receptionPoint.lat, receptionPoint.lng]
    if (currentPosition) return [currentPosition.lat, currentPosition.lng]
    if (recordedPath.length > 0) return [recordedPath[0].lat, recordedPath[0].lng]
    return [-29.0, 25.0] // South Africa default center
  }, [receptionPoint, currentPosition, recordedPath])

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return
    initializedRef.current = true

    const initMap = async () => {
      const L = (await import("leaflet")).default

      // Fix leaflet default icon issue with webpack
      // @ts-expect-error
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const center = getDefaultCenter()
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

      // Reception marker
      if (receptionPoint) {
        const recIcon = L.divIcon({
          className: "",
          html: `<div style="background:#2d8a4e;border:3px solid white;border-radius:50%;width:20px;height:20px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <div style="color:white;font-size:10px;font-weight:bold;">R</div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })
        receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], {
          icon: recIcon,
        })
          .addTo(m)
          .bindPopup("<strong>Reception</strong><br/>Starting point for all routes")
      }

      // Click to set reception
      if (mode === "reception" && onReceptionSet) {
        m.on("click", (e: {latlng: {lat: number, lng: number}}) => {
          onReceptionSet({ lat: e.latlng.lat, lng: e.latlng.lng })
        })
      }

      // Path polyline
      if (recordedPath.length > 0) {
        const latLngs = recordedPath.map((p) => [p.lat, p.lng] as [number, number])
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
          html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 4px rgba(59,130,246,0.3);" />`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
          icon: posIcon,
        })
          .addTo(m)
          .bindPopup("Your current position")
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

  // Update click handler when onReceptionSet changes
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || mode !== "reception") return

    m.off("click")
    if (onReceptionSet) {
      m.on("click", (e: {latlng: {lat: number, lng: number}}) => {
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

    import("leaflet").then(({ default: L }) => {
      if (receptionMarkerRef.current) {
        receptionMarkerRef.current.remove()
        receptionMarkerRef.current = null
      }
      if (receptionPoint) {
        const recIcon = L.divIcon({
          className: "",
          html: `<div style="background:#2d8a4e;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <div style="color:white;font-size:10px;font-weight:bold;">R</div>
          </div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
        receptionMarkerRef.current = L.marker([receptionPoint.lat, receptionPoint.lng], {
          icon: recIcon,
        })
          .addTo(m)
          .bindPopup("<strong>Reception</strong>")
        m.setView([receptionPoint.lat, receptionPoint.lng], Math.max(m.getZoom(), 16))
      }
    })
  }, [receptionPoint])

  // Update path polyline
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m) return

    import("leaflet").then(({ default: L }) => {
      if (pathPolylineRef.current) {
        pathPolylineRef.current.remove()
        pathPolylineRef.current = null
      }
      if (recordedPath.length > 1) {
        const latLngs = recordedPath.map((p) => [p.lat, p.lng] as [number, number])
        pathPolylineRef.current = L.polyline(latLngs, {
          color: "#e67e22",
          weight: 5,
          opacity: 0.9,
          dashArray: isRecording ? "10, 6" : undefined,
        }).addTo(m)
      }
    })
  }, [recordedPath, isRecording])

  // Update current position marker and pan map
  useEffect(() => {
    const m = mapInstanceRef.current
    if (!m || !currentPosition) return

    import("leaflet").then(({ default: L }) => {
      if (currentMarkerRef.current) {
        currentMarkerRef.current.setLatLng([currentPosition.lat, currentPosition.lng])
      } else {
        const posIcon = L.divIcon({
          className: "",
          html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 4px rgba(59,130,246,0.3);" />`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        })
        currentMarkerRef.current = L.marker([currentPosition.lat, currentPosition.lng], {
          icon: posIcon,
        })
          .addTo(m)
          .bindPopup("Your position")
      }

      // Follow user while recording
      if (isRecording) {
        m.setView([currentPosition.lat, currentPosition.lng], Math.max(m.getZoom(), 17), {
          animate: true,
        })
      }
    })
  }, [currentPosition, isRecording])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin="anonymous"
      />
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </>
  )
}
