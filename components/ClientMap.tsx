"use client"

import { useEffect, useRef } from "react"
import type { LatLng } from "@/lib/types"

interface ClientMapProps {
  path: LatLng[]
  receptionPoint: LatLng
  currentPosition: LatLng | null
  destinationName: string
  initialPosition?: LatLng | null
}

function injectLeafletCSS() {
  if (document.getElementById("leaflet-css")) return
  const style = document.createElement("style")
  style.id = "leaflet-css"
  style.textContent = `.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}.leaflet-container{overflow:hidden}.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}.leaflet-tile::selection{background:transparent}.leaflet-marker-icon,.leaflet-marker-shadow{display:block}.leaflet-container .leaflet-overlay-pane svg{max-width:none!important;max-height:none!important}.leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}.leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:pinch-zoom}.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{-ms-touch-action:none;touch-action:none}.leaflet-container{-webkit-tap-highlight-color:transparent}.leaflet-tile{filter:inherit;visibility:hidden}.leaflet-tile-loaded{visibility:inherit}.leaflet-zoom-box{width:0;height:0;box-sizing:border-box;z-index:800}.leaflet-pane{z-index:400}.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-shadow-pane{z-index:500}.leaflet-marker-pane{z-index:600}.leaflet-tooltip-pane{z-index:650}.leaflet-popup-pane{z-index:700}.leaflet-map-pane canvas{z-index:100}.leaflet-map-pane svg{z-index:200}.leaflet-control{position:relative;z-index:800;pointer-events:auto}.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}.leaflet-control{float:left;clear:both}.leaflet-right .leaflet-control{float:right}.leaflet-top .leaflet-control{margin-top:10px}.leaflet-bottom .leaflet-control{margin-bottom:10px}.leaflet-left .leaflet-control{margin-left:10px}.leaflet-right .leaflet-control{margin-right:10px}.leaflet-container{background:#ddd}.leaflet-container a{color:#0078A8}.leaflet-zoom-box{border:2px dotted #38f;background:rgba(255,255,255,.5)}.leaflet-container{font-family:Helvetica Neue,Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5}.leaflet-bar{box-shadow:0 1px 5px rgba(0,0,0,.65);border-radius:4px}.leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:black}.leaflet-bar a:hover{background-color:#f4f4f4}.leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}.leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}.leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}.leaflet-control-zoom-in,.leaflet-control-zoom-out{font:bold 18px 'Lucida Console',Monaco,monospace;text-indent:1px}.leaflet-control-attribution{background-color:rgba(255,255,255,.8);margin:0;padding:0 5px}.leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}.leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px}.leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-top:-1px;margin-left:-20px;overflow:hidden;pointer-events:none}.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;transform:rotate(45deg)}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:white;color:#333;box-shadow:0 3px 14px rgba(0,0,0,.4)}.leaflet-container a.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}.leaflet-div-icon{background:#fff;border:1px solid #666}`
  document.head.appendChild(style)
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).L) { resolve((window as any).L); return }
    injectLeafletCSS()
    if (document.getElementById("leaflet-js")) {
      const wait = setInterval(() => { if ((window as any).L) { clearInterval(wait); resolve((window as any).L) } }, 50)
      return
    }
    const script = document.createElement("script")
    script.id = "leaflet-js"
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
    script.onload = () => resolve((window as any).L)
    script.onerror = () => {
      const s2 = document.createElement("script")
      s2.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
      s2.onload = () => resolve((window as any).L)
      s2.onerror = () => reject(new Error("Could not load Leaflet"))
      document.head.appendChild(s2)
    }
    document.head.appendChild(script)
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

export default function ClientMap({ path, receptionPoint, currentPosition, destinationName, initialPosition }: ClientMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const currentMarkerRef = useRef<any>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!mapDivRef.current || initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      const L = await loadLeaflet()
      if (!mapDivRef.current) return

      delete (L.Icon.Default.prototype as any)._getIconUrl

      // Center priority: already-granted GPS → reception point → first path point
      let center: [number, number]
      if (initialPosition) {
        center = [initialPosition.lat, initialPosition.lng]
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
