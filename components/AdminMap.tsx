"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { LatLng } from "@/lib/types"

interface AdminMapProps {
  mode: "reception" | "record"
  receptionPoint?: LatLng | null
  onReceptionSet?: (latlng: LatLng) => void
  recordedPath?: LatLng[]
  currentPosition?: LatLng | null
  isRecording?: boolean
}

function injectLeafletCSS() {
  if (document.getElementById("leaflet-css")) return
  const style = document.createElement("style")
  style.id = "leaflet-css"
  // Minimal Leaflet CSS inline — no external requests
  style.textContent = `.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0}.leaflet-container{overflow:hidden}.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow{-webkit-user-select:none;-moz-user-select:none;user-select:none;-webkit-user-drag:none}.leaflet-tile::selection{background:transparent}.leaflet-safari .leaflet-tile{image-rendering:-webkit-optimize-contrast}.leaflet-safari .leaflet-tile-container{width:1600px;height:1600px;-webkit-transform-origin:0 0}.leaflet-marker-icon,.leaflet-marker-shadow{display:block}.leaflet-container .leaflet-overlay-pane svg{max-width:none!important;max-height:none!important}.leaflet-container.leaflet-touch-zoom{-ms-touch-action:pan-x pan-y;touch-action:pan-x pan-y}.leaflet-container.leaflet-touch-drag{-ms-touch-action:pinch-zoom;touch-action:none;touch-action:pinch-zoom}.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom{-ms-touch-action:none;touch-action:none}.leaflet-container{-webkit-tap-highlight-color:transparent}.leaflet-container a{-webkit-tap-highlight-color:rgba(51,181,229,.4)}.leaflet-tile{filter:inherit;visibility:hidden}.leaflet-tile-loaded{visibility:inherit}.leaflet-zoom-box{width:0;height:0;-moz-box-sizing:border-box;box-sizing:border-box;z-index:800}.leaflet-overlay-pane svg{-moz-user-select:none}.leaflet-pane{z-index:400}.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-shadow-pane{z-index:500}.leaflet-marker-pane{z-index:600}.leaflet-tooltip-pane{z-index:650}.leaflet-popup-pane{z-index:700}.leaflet-map-pane canvas{z-index:100}.leaflet-map-pane svg{z-index:200}.leaflet-vml-shape{width:1px;height:1px}.lvml{behavior:url(#default#VML);display:inline-block;position:absolute}.leaflet-control{position:relative;z-index:800;pointer-events:visiblePainted;pointer-events:auto}.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none}.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}.leaflet-control{float:left;clear:both}.leaflet-right .leaflet-control{float:right}.leaflet-top .leaflet-control{margin-top:10px}.leaflet-bottom .leaflet-control{margin-bottom:10px}.leaflet-left .leaflet-control{margin-left:10px}.leaflet-right .leaflet-control{margin-right:10px}.leaflet-fade-anim .leaflet-popup{opacity:0;-webkit-transition:opacity .2s linear;-moz-transition:opacity .2s linear;transition:opacity .2s linear}.leaflet-fade-anim .leaflet-map-pane .leaflet-popup{opacity:1}.leaflet-zoom-animated{-webkit-transform-origin:0 0;-ms-transform-origin:0 0;transform-origin:0 0}.leaflet-zoom-anim .leaflet-zoom-animated{will-change:transform}.leaflet-zoom-anim .leaflet-zoom-animated{-webkit-transition:-webkit-transform .25s cubic-bezier(0,0,.25,1);-moz-transition:-moz-transform .25s cubic-bezier(0,0,.25,1);transition:transform .25s cubic-bezier(0,0,.25,1)}.leaflet-zoom-anim .leaflet-tile,.leaflet-pan-anim .leaflet-tile{-webkit-transition:none;-moz-transition:none;transition:none}.leaflet-zoom-anim .leaflet-zoom-animated.leaflet-zoom-hide{visibility:hidden}.leaflet-interactive{cursor:pointer}.leaflet-grab{cursor:-webkit-grab;cursor:-moz-grab;cursor:grab}.leaflet-crosshair,.leaflet-crosshair .leaflet-interactive{cursor:crosshair}.leaflet-popup-pane,.leaflet-control{cursor:auto}.leaflet-dragging .leaflet-grab,.leaflet-dragging .leaflet-grab .leaflet-interactive,.leaflet-dragging .leaflet-marker-draggable{cursor:move;cursor:-webkit-grabbing;cursor:-moz-grabbing;cursor:grabbing}.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-image-layer,.leaflet-pane>svg path,.leaflet-tile-container{pointer-events:none}.leaflet-marker-icon.leaflet-interactive,.leaflet-image-layer.leaflet-interactive,.leaflet-pane>svg path.leaflet-interactive,svg.leaflet-image-layer.leaflet-interactive path{pointer-events:visiblePainted;pointer-events:auto}.leaflet-container{background:#ddd;outline-offset:1px}.leaflet-container a{color:#0078A8}.leaflet-container a.leaflet-active{outline:2px solid orange}.leaflet-zoom-box{border:2px dotted #38f;background:rgba(255,255,255,.5)}.leaflet-container{font-family:Helvetica Neue,Arial,Helvetica,sans-serif;font-size:.75rem;font-size:12px;line-height:1.5}.leaflet-bar{box-shadow:0 1px 5px rgba(0,0,0,.65);border-radius:4px}.leaflet-bar a{background-color:#fff;border-bottom:1px solid #ccc;width:26px;height:26px;line-height:26px;display:block;text-align:center;text-decoration:none;color:black}.leaflet-bar a,.leaflet-control-layers-toggle{background-position:50% 50%;background-repeat:no-repeat;display:block}.leaflet-bar a:hover,.leaflet-bar a:focus{background-color:#f4f4f4}.leaflet-bar a:first-child{border-top-left-radius:4px;border-top-right-radius:4px}.leaflet-bar a:last-child{border-bottom-left-radius:4px;border-bottom-right-radius:4px;border-bottom:none}.leaflet-bar a.leaflet-disabled{cursor:default;background-color:#f4f4f4;color:#bbb}.leaflet-touch .leaflet-bar a{width:30px;height:30px;line-height:30px}.leaflet-touch .leaflet-bar a:first-child{border-top-left-radius:2px;border-top-right-radius:2px}.leaflet-touch .leaflet-bar a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px}.leaflet-control-zoom-in,.leaflet-control-zoom-out{font:bold 18px 'Lucida Console',Monaco,monospace;text-indent:1px}.leaflet-touch .leaflet-control-zoom-in{font-size:22px}.leaflet-touch .leaflet-control-zoom-out{font-size:20px}.leaflet-control-attribution{background-color:rgba(255,255,255,.8);margin:0;padding:0 5px}.leaflet-control-attribution .leaflet-attribution-flag{display:inline!important;vertical-align:baseline!important;width:1em;height:.6669em}.leaflet-left .leaflet-control-scale{margin-left:5px}.leaflet-bottom .leaflet-control-scale{margin-bottom:5px}.leaflet-control-scale-line{border:2px solid #777;border-top:none;line-height:1.1;padding:2px 5px 1px;font-size:11px;white-space:nowrap;overflow:hidden;-moz-box-sizing:border-box;box-sizing:border-box;background:rgba(255,255,255,.8)}.leaflet-control-scale-line:not(:first-child){border-top:2px solid #777;border-bottom:none;margin-top:-2px}.leaflet-control-scale-line:not(:first-child):not(:last-child){border-bottom:2px solid #777}.leaflet-touch .leaflet-control-attribution,.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{box-shadow:none}.leaflet-touch .leaflet-control-layers,.leaflet-touch .leaflet-bar{border:2px solid rgba(0,0,0,.2);background-clip:padding-box}.leaflet-popup{position:absolute;text-align:center;margin-bottom:20px}.leaflet-popup-content-wrapper{padding:1px;text-align:left;border-radius:12px}.leaflet-popup-content{margin:13px 24px 13px 20px;line-height:1.3;font-size:13px;min-height:1px}.leaflet-popup-content p{margin:17px 0 11px}.leaflet-popup-tip-container{width:40px;height:20px;position:absolute;left:50%;margin-top:-1px;margin-left:-20px;overflow:hidden;pointer-events:none}.leaflet-popup-tip{width:17px;height:17px;padding:1px;margin:-10px auto 0;-webkit-transform:rotate(45deg);-moz-transform:rotate(45deg);-ms-transform:rotate(45deg);transform:rotate(45deg)}.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:white;color:#333;box-shadow:0 3px 14px rgba(0,0,0,.4)}.leaflet-container a.leaflet-popup-close-button{position:absolute;top:0;right:0;border:none;text-align:center;width:24px;height:24px;font:16px/24px Tahoma,Verdana,sans-serif;color:#757575;text-decoration:none;background:transparent}.leaflet-container a.leaflet-popup-close-button:hover,.leaflet-container a.leaflet-popup-close-button:focus{color:#585858}.leaflet-popup-scrolled{overflow:auto;border-bottom:1px solid #ddd;border-top:1px solid #ddd}.leaflet-oldie .leaflet-popup-content-wrapper{-ms-zoom:1}.leaflet-oldie .leaflet-popup-tip{width:24px;-ms-filter:"progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";filter:progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)}.leaflet-oldie .leaflet-popup-tip-container{margin-top:-1px}.leaflet-oldie .leaflet-control-zoom,.leaflet-oldie .leaflet-control-layers,.leaflet-oldie .leaflet-popup-content-wrapper,.leaflet-oldie .leaflet-popup-tip{border:1px solid #999}.leaflet-div-icon{background:#fff;border:1px solid #666}`
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
    // Try unpkg first, fall back to cdnjs
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

    // Suppress default icon URL lookup — we use divIcons everywhere
    delete (L.Icon.Default.prototype as any)._getIconUrl

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
