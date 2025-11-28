// frontend/src/api/client.ts
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

// Instancia de axios para toda la app
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

/**
 * Devuelve los headers de autenticación (JWT Bearer)
 * si hay token en localStorage.
 */
export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token')
  if (!token) {
    return {}
  }
  return {
    Authorization: `Bearer ${token}`,
  }
}
