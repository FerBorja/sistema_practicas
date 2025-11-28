// src/components/DestinoConMapa.tsx

import React, { useState } from 'react'
import { apiClient } from '../api/client'

interface DestinoConMapaProps {
  destinoTexto: string
  onDestinoChange: (nuevoTexto: string) => void
}

export interface SugerenciaDestino {
  label: string
  lat: number
  lon: number
  region: string | null
}

const DestinoConMapa: React.FC<DestinoConMapaProps> = ({
  destinoTexto,
  onDestinoChange,
}) => {
  const [sugerencias, setSugerencias] = useState<SugerenciaDestino[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<string>('')

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    onDestinoChange(value)
    setError(null)

    // No pedimos sugerencias si hay menos de 3 caracteres
    if (value.length < 3) {
      setSugerencias([])
      return
    }

    try {
      setCargando(true)
      const response = await apiClient.get<SugerenciaDestino[]>(
        '/reservas/sugerencias-destino/',
        {
          params: { q: value },
        }
      )
      setSugerencias(response.data)
    } catch (err) {
      console.error(err)
      setError('No se pudieron obtener sugerencias.')
      setSugerencias([])
    } finally {
      setCargando(false)
    }
  }

  const handleSeleccionSugerencia = (s: SugerenciaDestino) => {
    // Rellenamos el textbox con el label de la sugerencia
    onDestinoChange(s.label)
    setDestinoSeleccionado(s.label)
    setSugerencias([])
  }

  // Texto que usaremos para el mapa: lo que el usuario haya seleccionado
  // o, en su defecto, lo que esté escrito actualmente.
  const textoMapa = destinoSeleccionado || destinoTexto

  return (
    <div className="destino-con-mapa">
      <label>
        Destino:
        <input
          type="text"
          value={destinoTexto}
          onChange={handleInputChange}
          placeholder="Ej. Guadalajara, Jalisco, México"
        />
      </label>

      {cargando && (
        <div className="small-hint">Buscando sugerencias...</div>
      )}
      {error && <div className="error small-hint">{error}</div>}

      {sugerencias.length > 0 && (
        <ul className="sugerencias-list">
          {sugerencias.map((s, idx) => (
            <li
              key={`${s.lat}-${s.lon}-${idx}`}
              onClick={() => handleSeleccionSugerencia(s)}
            >
              {s.label}
              {s.region ? ` (${s.region})` : ''}
            </li>
          ))}
        </ul>
      )}

      {textoMapa && (
        <div className="map-preview">
          <iframe
            title="Mapa destino"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              textoMapa
            )}&output=embed`}
            width="100%"
            height="300"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  )
}

export default DestinoConMapa
