import axios from 'axios'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api'

// Interface para el vehículo que devuelve el backend
export interface Vehiculo {
  id: number
  nombre: string
  tipo: 'VAN' | 'CAMION'
  capacidad_pasajeros: number
  requiere_chofer_oficial: boolean
  activo: boolean
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})
