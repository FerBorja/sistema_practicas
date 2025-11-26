import { useEffect, useState } from 'react'
import './App.css'
import { apiClient } from './api/client'
import type { Vehiculo } from './api/client'
import axios, { type AxiosError } from 'axios'

interface ReservaForm {
  vehiculoId: number | ''
  destinoTexto: string
  fechaInicio: string
  fechaFin: string
  personasViajan: number | ''
  vanNecesitaChofer: boolean
}

function App() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<ReservaForm>({
    vehiculoId: '',
    destinoTexto: '',
    fechaInicio: '',
    fechaFin: '',
    personasViajan: '',
    vanNecesitaChofer: false,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<Vehiculo[]>([])
  const [detalleSinDisponibles, setDetalleSinDisponibles] = useState<string | null>(
    null
  )

  useEffect(() => {
    const fetchVehiculos = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.get<Vehiculo[]>('/vehiculos/')
        setVehiculos(response.data)
      } catch (err) {
        console.error(err)
        setError('No se pudieron cargar los vehículos.')
      } finally {
        setLoading(false)
      }
    }

    fetchVehiculos()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'vehiculoId' || name === 'personasViajan'
          ? value === ''
            ? ''
            : Number(value)
          : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setDetalleSinDisponibles(null)

    if (
      !form.vehiculoId ||
      !form.destinoTexto ||
      !form.fechaInicio ||
      !form.fechaFin ||
      !form.personasViajan
    ) {
      setMessage('Por favor llena todos los campos.')
      return
    }

    // 👇 Nuevo: el vehículo elegido debe estar en la última lista de disponibles
    const vehiculoDisponible = vehiculosDisponibles.some(
      (v) => v.id === form.vehiculoId
    )

    if (!vehiculoDisponible) {
      setMessage(
        'Primero comprueba la disponibilidad y asegúrate de seleccionar un vehículo que aparezca como disponible para estos parámetros.'
      )
      return
    }

    try {
      setSaving(true)

      await apiClient.post('/reservas/', {
        vehiculo: form.vehiculoId,
        destino_texto: form.destinoTexto,
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
        personas_viajan: form.personasViajan,
      })

      setMessage('Reserva creada (demo) correctamente.')
      setForm({
        vehiculoId: '',
        destinoTexto: '',
        fechaInicio: '',
        fechaFin: '',
        personasViajan: '',
        vanNecesitaChofer: false,
      })
      setVehiculosDisponibles([])
    } catch (err) {
      console.error(err)
      setMessage('Error al crear la reserva.')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckAvailability = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault()
    setMessage(null)
    setDetalleSinDisponibles(null)

    if (
      !form.destinoTexto ||
      !form.fechaInicio ||
      !form.fechaFin ||
      !form.personasViajan
    ) {
      setMessage(
        'Para comprobar disponibilidad, llena destino, fechas y personas.'
      )
      return
    }

    try {
      setSaving(true)
      setVehiculosDisponibles([])

      const response = await apiClient.post<{
        vehiculos_disponibles: Vehiculo[]
        duracion_horas: number
        es_fuera_chihuahua: boolean
        requiere_dos_choferes: boolean
      }>('/reservas/disponibilidad/', {
        fecha_inicio: form.fechaInicio,
        fecha_fin: form.fechaFin,
        personas_viajan: form.personasViajan,
        destino_texto: form.destinoTexto,
        van_necesita_chofer: form.vanNecesitaChofer,
        tipo: null,
      })

      const lista = response.data.vehiculos_disponibles ?? []
      setVehiculosDisponibles(lista)

      const horas = response.data.duracion_horas.toFixed(1)
      const dentroFuera = response.data.es_fuera_chihuahua
        ? 'fuera de Chihuahua'
        : 'dentro de Chihuahua'

      if (lista.length > 0) {
        setMessage(
          `Duración ~${horas} h (${dentroFuera}). Hay ${lista.length} vehículo(s) disponible(s).`
        )
      } else {
        setMessage(
          `Duración ~${horas} h (${dentroFuera}). No hay vehículos disponibles con esos parámetros.`
        )

        // 🔍 Explicación adicional basada en la regla del 75%
        const detalle = construirExplicacionCapacidad(
          vehiculos,
          form.personasViajan
        )
        if (detalle) {
          setDetalleSinDisponibles(detalle)
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ detail?: string }>
        const status = axiosErr.response?.status
        const detail = axiosErr.response?.data?.detail

        if (detail) {
          setMessage(detail)
          setVehiculosDisponibles([])
          setDetalleSinDisponibles(null)
        } else {
          setMessage('Error al comprobar disponibilidad.')
        }

        // Solo logueamos si es algo inesperado (5xx, sin respuesta, etc.)
        if (!status || status >= 500) {
          console.error(err)
        }
      } else {
        console.error(err)
        setMessage('Error al comprobar disponibilidad.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="app-container">Cargando vehículos...</div>
  }

  if (error) {
    return <div className="app-container error">{error}</div>
  }

  // Vehículo actualmente seleccionado (si hay)
  const selectedVehiculo =
    vehiculos.find((v) => v.id === form.vehiculoId) ?? null

  return (
    <div className="app-container">
      <h1>Vehículos oficiales UACH</h1>

      {/* Tabla de vehículos */}
      {vehiculos.length === 0 ? (
        <p>No hay vehículos registrados.</p>
      ) : (
        <table className="vehiculos-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capacidad</th>
              <th>Requiere chofer oficial</th>
            </tr>
          </thead>
          <tbody>
            {vehiculos.map((v) => (
              <tr key={v.id}>
                <td>{v.nombre}</td>
                <td>{v.tipo === 'VAN' ? 'Van' : 'Camión'}</td>
                <td>{v.capacidad_pasajeros}</td>
                <td>{v.requiere_chofer_oficial ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Formulario de reserva demo */}
      <h2 style={{ marginTop: '2rem' }}>Crear reserva (demo)</h2>
      {message && <p>{message}</p>}
      {detalleSinDisponibles && (
        <div className="hint-box">
          <small>{detalleSinDisponibles}</small>
        </div>
      )}

      <form onSubmit={handleSubmit} className="reserva-form">
        <div className="form-row">
          <label>
            Vehículo:
            <select
              name="vehiculoId"
              value={form.vehiculoId}
              onChange={handleChange}
            >
              <option value="">Selecciona un vehículo</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre} ({v.capacidad_pasajeros} pax)
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Destino:
            <input
              type="text"
              name="destinoTexto"
              value={form.destinoTexto}
              onChange={handleChange}
              placeholder="Ej. Guadalajara, Jalisco, México"
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Fecha inicio:
            <input
              type="date"
              name="fechaInicio"
              value={form.fechaInicio}
              onChange={handleChange}
            />
          </label>
          <label>
            Fecha fin:
            <input
              type="date"
              name="fechaFin"
              value={form.fechaFin}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="form-row">
          <label>
            Personas que viajan:
            <input
              type="number"
              name="personasViajan"
              min={1}
              value={form.personasViajan}
              onChange={handleChange}
            />
          </label>
        </div>

        {/* Solo mostrar el checkbox si el vehículo seleccionado es una VAN */}
        {selectedVehiculo && selectedVehiculo.tipo === 'VAN' && (
          <div className="form-row">
            <label>
              ¿Van necesita chofer UACH?
              <input
                type="checkbox"
                checked={form.vanNecesitaChofer}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    vanNecesitaChofer: e.target.checked,
                  }))
                }
              />
            </label>
          </div>
        )}

        {/* Para camiones, informar que siempre requieren chofer oficial */}
        {selectedVehiculo &&
          selectedVehiculo.tipo === 'CAMION' &&
          selectedVehiculo.requiere_chofer_oficial && (
            <div className="form-row">
              <p>Este camión siempre requiere chofer oficial de la UACH.</p>
            </div>
          )}

        <div className="form-row">
          <button
            type="button"
            onClick={handleCheckAvailability}
            disabled={saving}
          >
            {saving ? 'Comprobando...' : 'Comprobar disponibilidad'}
          </button>

          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear reserva'}
          </button>
        </div>
      </form>

      {vehiculosDisponibles.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h3>Vehículos disponibles para este viaje</h3>
          <ul>
            {vehiculosDisponibles.map((v) => (
              <li key={v.id}>
                <strong>{v.nombre}</strong> —{' '}
                {v.tipo === 'VAN' ? 'Van' : 'Camión'} — {v.capacidad_pasajeros} pax
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Construye una explicación de por qué no hay vehículos desde
 * el punto de vista de CAPACIDAD (regla del 75%).
 *
 * Sólo devuelve texto si con `personas` NO alcanza el 75% para NINGÚN vehículo.
 */
function construirExplicacionCapacidad(
  vehiculos: Vehiculo[],
  personasViajan: number | ''
): string | null {
  if (!vehiculos.length || !personasViajan) return null

  const personas = Number(personasViajan)
  if (!Number.isFinite(personas) || personas <= 0) return null

  const vehiculosConMin = vehiculos.map((v) => {
    const min = Math.ceil(v.capacidad_pasajeros * 0.75)
    return { vehiculo: v, min }
  })

  const vehiculosDemasiadoChicos = vehiculosConMin.filter(
    ({ min }) => personas < min
  )

  // Si al menos un vehículo SÍ cumple el 75%, no inventamos explicación de capacidad
  if (vehiculosDemasiadoChicos.length !== vehiculosConMin.length) {
    return null
  }

  // Ordenamos por mínimo requerido
  const ordenados = [...vehiculosConMin].sort((a, b) => a.min - b.min)
  const recomendado = ordenados[0]

  const ejemplos = ordenados
    .slice(0, 3)
    .map(
      ({ vehiculo, min }) =>
        `${vehiculo.nombre} (${vehiculo.capacidad_pasajeros} pax) requiere mínimo ${min}`
    )

  const ejemplosTexto = ejemplos.join(' · ')

  return (
    `Con ${personas} persona(s) no se cumple el mínimo de ocupación del 75% ` +
    `para ningún vehículo. Ejemplos: ${ejemplosTexto}. ` +
    `Para poder usar al menos un vehículo, necesitarías al menos ` +
    `${recomendado.min} persona(s) (por ejemplo: ${recomendado.vehiculo.nombre}, ` +
    `${recomendado.vehiculo.capacidad_pasajeros} pax).`
  )
}

export default App
