export interface LatLng {
  lat: number
  lng: number
}

export interface House {
  id: string
  name: string
  path: LatLng[]
  receptionPoint: LatLng
  createdAt: string
  description?: string
}

export interface PropertyConfig {
  receptionPoint: LatLng | null
  defaultZoom: number
  propertyName: string
}
