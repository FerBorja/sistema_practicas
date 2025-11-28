import { useEffect, useState } from 'react'
import './App.css'
import { apiClient, getAuthHeaders } from './api/client'
import type { Vehiculo } from './api/client'
import axios, { type AxiosError } from 'axios'
import { login, registerApi } from './api/auth'

interface ReservaForm {
  vehiculoId: number | ''
  destinoTexto: string
  fechaInicio: string
  fechaFin: string
  personasViajan: number | ''
  vanNecesitaChofer: boolean
}

interface Reserva {
  id: number
  vehiculo: number | Vehiculo
  destino_texto: string
  fecha_inicio: string
  fecha_fin: string
  personas_viajan: number
  estado: 'PENDIENTE' | 'AUTORIZADA' | 'RECHAZADA' | string
  created_at: string
}

interface PerfilRespuesta {
  user: {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
  }
  perfil: {
    rol: 'ESTANDAR' | 'ADMIN'
    matricula_o_empleado: string
  } | null
}

interface ErrorDetailResponse {
  detail?: string
}

interface DestinoSugerencia {
  label: string
  lat: number
  lon: number
  region: string | null
}

/* ------------------------------ App (Auth) ------------------------------ */

function App() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  )
  const [authMode, setAuthMode] = useState<'login' | 'registro'>('login')
  const [authError, setAuthError] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regNombre, setRegNombre] = useState('')
  const [regMatricula, setRegMatricula] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    try {
      const data = await login(loginEmail, loginPassword)
      console.log('[login] tokens recibidos:', data)
      localStorage.setItem('token', data.access)
      setToken(data.access)
    } catch (err) {
      console.error(err)
      setAuthError('Credenciales inválidas o error de conexión.')
    }
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    try {
      await registerApi(regNombre, regMatricula, regEmail, regPassword)
      // Después de registrarse, lo mandamos a login
      setAuthMode('login')
      setLoginEmail(regEmail)
      setAuthError('Registro exitoso. Ahora inicia sesión.')
    } catch (err) {
      console.error(err)

      if (axios.isAxiosError(err)) {
        type ErrorResponse = Record<string, string[] | string>
        const axiosErr = err as AxiosError<ErrorResponse>
        const data = axiosErr.response?.data

        if (data && typeof data === 'object') {
          const mensajes: string[] = []

          for (const [campo, erroresCampo] of Object.entries(data)) {
            if (Array.isArray(erroresCampo)) {
              mensajes.push(`${campo}: ${erroresCampo.join(' ')}`)
            } else if (typeof erroresCampo === 'string') {
              mensajes.push(`${campo}: ${erroresCampo}`)
            }
          }

          if (mensajes.length > 0) {
            setAuthError(mensajes.join(' | '))
            return
          }
        }
      }

      setAuthError('Error al registrar. Verifica los datos y el correo @uach.mx.')
    }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    setToken(null)
  }

  // Si no hay token, mostramos pantalla de login/registro
  if (!token) {
    return (
      <div className="app-container">
        <h1>Vehículos oficiales UACH</h1>
        <h2>{authMode === 'login' ? 'Iniciar sesión' : 'Registro'}</h2>

        {authError && <p>{authError}</p>}

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-row">
              <label>
                Correo institucional:
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="usuario@uach.mx"
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Contraseña:
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit">Entrar</button>

            <p style={{ marginTop: '1rem' }}>
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('registro')}
                style={{
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                Regístrate aquí
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegistro} className="auth-form">
            <div className="form-row">
              <label>
                Nombre completo:
                <input
                  type="text"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Matrícula o número de empleado:
                <input
                  type="text"
                  value={regMatricula}
                  onChange={(e) => setRegMatricula(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Correo institucional:
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="usuario@uach.mx"
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Contraseña:
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit">Registrarme</button>

            <p style={{ marginTop: '1rem' }}>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                style={{
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                Inicia sesión
              </button>
            </p>
          </form>
        )}
      </div>
    )
  }

  // Si hay token, renderizamos la app de reservas
  return <ReservasApp onLogout={handleLogout} />
}

/* --------------------------- ReservasApp (main) -------------------------- */

interface ReservasAppProps {
  onLogout: () => void
}

function ReservasApp({ onLogout }: ReservasAppProps) {
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

  const [vehiculosDisponibles, setVehiculosDisponibles] = useState<Vehiculo[]>(
    []
  )
  const [detalleSinDisponibles, setDetalleSinDisponibles] = useState<string | null>(
    null
  )

  const [isAdmin, setIsAdmin] = useState(false)
  const [perfilCargando, setPerfilCargando] = useState(true)

  const [reservas, setReservas] = useState<Reserva[]>([])
  const [reservasLoading, setReservasLoading] = useState(false)
  const [reservasError, setReservasError] = useState<string | null>(null)
  const [accionEnCursoId, setAccionEnCursoId] = useState<number | null>(null)

  // Autocomplete destino + mapa
  const [destinoSugerencias, setDestinoSugerencias] = useState<DestinoSugerencia[]>(
    []
  )
  const [destinoLoading, setDestinoLoading] = useState(false)
  const [selectedDestino, setSelectedDestino] = useState<DestinoSugerencia | null>(
    null
  )

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

  const fetchPerfil = async () => {
    try {
      setPerfilCargando(true)
      const response = await apiClient.get<PerfilRespuesta>('/auth/perfil/', {
        headers: getAuthHeaders(),
      })
      const rol = response.data.perfil?.rol
      setIsAdmin(rol === 'ADMIN')
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorDetailResponse>(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail
        console.error('Error al cargar perfil', status, detail)

        if (status === 401) {
          // Token inválido/ausente → salir a login
          onLogout()
          return
        }
      } else {
        console.error('Error al cargar perfil', err)
      }
    } finally {
      setPerfilCargando(false)
    }
  }

  const fetchReservas = async () => {
    try {
      setReservasLoading(true)
      setReservasError(null)
      const response = await apiClient.get<Reserva[]>('/reservas/', {
        headers: getAuthHeaders(),
      })
      setReservas(response.data)
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorDetailResponse>(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail
        console.error('Error al cargar reservas', status, detail)

        if (status === 401) {
          onLogout()
          return
        }
      } else {
        console.error('Error al cargar reservas', err)
      }
      setReservasError('No se pudieron cargar las reservas.')
    } finally {
      setReservasLoading(false)
    }
  }

  useEffect(() => {
    void fetchVehiculos()
    void fetchPerfil()
    void fetchReservas()
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

  // Cambio específico para el destino: actualiza texto + pide sugerencias
  const handleDestinoInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value
    setForm((prev) => ({
      ...prev,
      destinoTexto: value,
    }))
    setSelectedDestino(null)

    const trimmed = value.trim()
    if (trimmed.length < 3) {
      setDestinoSugerencias([])
      return
    }

    try {
      setDestinoLoading(true)
      const response = await apiClient.get<DestinoSugerencia[]>(
        '/reservas/sugerencias-destino/',
        {
          params: { q: trimmed },
          headers: getAuthHeaders(),
        }
      )
      setDestinoSugerencias(response.data)
    } catch (err) {
      console.error('Error cargando sugerencias de destino', err)
    } finally {
      setDestinoLoading(false)
    }
  }

  const handleSelectSugerencia = (sug: DestinoSugerencia) => {
    setForm((prev) => ({
      ...prev,
      destinoTexto: sug.label,
    }))
    setSelectedDestino(sug)
    setDestinoSugerencias([])
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

      await apiClient.post(
        '/reservas/',
        {
          vehiculo: form.vehiculoId,
          destino_texto: form.destinoTexto,
          fecha_inicio: form.fechaInicio,
          fecha_fin: form.fechaFin,
          personas_viajan: form.personasViajan,
        },
        {
          headers: getAuthHeaders(),
        }
      )

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
      setSelectedDestino(null)
      setDestinoSugerencias([])
      await fetchReservas()
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
      }>(
        '/reservas/disponibilidad/',
        {
          fecha_inicio: form.fechaInicio,
          fecha_fin: form.fechaFin,
          personas_viajan: form.personasViajan,
          destino_texto: form.destinoTexto,
          van_necesita_chofer: form.vanNecesitaChofer,
          tipo: null,
        },
        {
          headers: getAuthHeaders(),
        }
      )

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

        const detalle = construirExplicacionCapacidad(
          vehiculos,
          form.personasViajan
        )
        if (detalle) {
          setDetalleSinDisponibles(detalle)
        }
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<ErrorDetailResponse>(err)) {
        const status = err.response?.status
        const detail = err.response?.data?.detail

        if (detail) {
          setMessage(detail)
          setVehiculosDisponibles([])
          setDetalleSinDisponibles(null)
        } else {
          setMessage('Error al comprobar disponibilidad.')
        }

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

  const handleAutorizarReserva = async (reservaId: number) => {
    setMessage(null)
    try {
      setAccionEnCursoId(reservaId)
      await apiClient.post(
        `/reservas/${reservaId}/autorizar/`,
        {},
        {
          headers: getAuthHeaders(),
        }
      )
      setMessage('Reserva autorizada correctamente.')
      await fetchReservas()
    } catch (err) {
      console.error(err)
      setMessage('No se pudo autorizar la reserva.')
    } finally {
      setAccionEnCursoId(null)
    }
  }

  const handleRechazarReserva = async (reservaId: number) => {
    setMessage(null)
    try {
      setAccionEnCursoId(reservaId)
      await apiClient.post(
        `/reservas/${reservaId}/rechazar/`,
        {},
        {
          headers: getAuthHeaders(),
        }
      )
      setMessage('Reserva rechazada correctamente.')
      await fetchReservas()
    } catch (err) {
      console.error(err)
      setMessage('No se pudo rechazar la reserva.')
    } finally {
      setAccionEnCursoId(null)
    }
  }

  if (loading) {
    return <div className="app-container">Cargando vehículos...</div>
  }

  if (error) {
    return <div className="app-container error">{error}</div>
  }

  const selectedVehiculo =
    vehiculos.find((v) => v.id === form.vehiculoId) ?? null

  const rolTexto = perfilCargando
    ? 'Cargando perfil...'
    : isAdmin
    ? 'Rol: Administrador'
    : 'Rol: Usuario estándar'

  const obtenerDescripcionVehiculo = (reserva: Reserva): string => {
    const v = reserva.vehiculo
    if (typeof v === 'number') {
      const encontrado = vehiculos.find((veh) => veh.id === v)
      if (encontrado) {
        return `${encontrado.nombre} (${encontrado.capacidad_pasajeros} pax)`
      }
      return `Vehículo #${v}`
    }
    return `${v.nombre} (${v.capacidad_pasajeros} pax)`
  }

  // URL del mapa (OpenStreetMap embed, no interactivo porque le quitamos pointer-events)
  let mapSrc: string | null = null
  if (selectedDestino) {
    const delta = 0.1
    const left = selectedDestino.lon - delta
    const right = selectedDestino.lon + delta
    const top = selectedDestino.lat + delta
    const bottom = selectedDestino.lat - delta
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${left},${bottom},${right},${top}&layer=mapnik&marker=${selectedDestino.lat},${selectedDestino.lon}`
  }

  return (
    <div className="app-container">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Vehículos oficiales UACH</h1>
        <button type="button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
      <div
        style={{ textAlign: 'right', fontSize: '0.9rem', marginBottom: '0.5rem' }}
      >
        {rolTexto}
      </div>

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

        <div className="form-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <label style={{ width: '100%' }}>
            Destino:
            <input
              type="text"
              name="destinoTexto"
              value={form.destinoTexto}
              onChange={handleDestinoInputChange}
              placeholder="Ej. Guadalajara, Jalisco, México"
              autoComplete="off"
            />
          </label>

          {destinoLoading && (
            <small style={{ marginTop: '0.25rem' }}>Buscando sugerencias...</small>
          )}

          {destinoSugerencias.length > 0 && (
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                marginTop: '0.25rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                maxHeight: '150px',
                overflowY: 'auto',
                width: '100%',
                background: '#fff',
                zIndex: 10,
              }}
            >
              {destinoSugerencias.map((sug, idx) => (
                <li
                  key={`${sug.lat}-${sug.lon}-${idx}`}
                  onClick={() => handleSelectSugerencia(sug)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    cursor: 'pointer',
                    borderBottom:
                      idx === destinoSugerencias.length - 1
                        ? 'none'
                        : '1px solid #eee',
                  }}
                >
                  {sug.label}
                  {sug.region && (
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {' '}
                      ({sug.region})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {mapSrc && (
            <div
              style={{
                marginTop: '0.5rem',
                width: '100%',
                maxWidth: '600px',
                height: '300px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <iframe
                title="Mapa destino"
                src={mapSrc}
                style={{
                  width: '100%',
                  height: '100%',
                  border: '0',
                  pointerEvents: 'none', // para que no sea “interactivo” al usuario
                }}
              />
            </div>
          )}
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

      {/* Vista Mis solicitudes / Panel admin */}
      <h2 style={{ marginTop: '2rem' }}>
        {isAdmin ? 'Panel admin: solicitudes de vehículos' : 'Mis solicitudes'}
      </h2>

      {reservasError && <p className="error">{reservasError}</p>}

      {reservasLoading && reservas.length === 0 ? (
        <p>Cargando solicitudes...</p>
      ) : reservas.length === 0 ? (
        <p>
          {isAdmin
            ? 'No hay solicitudes registradas.'
            : 'No tienes solicitudes registradas.'}
        </p>
      ) : (
        <table className="vehiculos-table" style={{ marginTop: '0.5rem' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehículo</th>
              <th>Destino</th>
              <th>Fechas</th>
              <th>Personas</th>
              <th>Estado</th>
              {isAdmin && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{obtenerDescripcionVehiculo(r)}</td>
                <td>{r.destino_texto}</td>
                <td>
                  {r.fecha_inicio} → {r.fecha_fin}
                </td>
                <td>{r.personas_viajan}</td>
                <td>{r.estado}</td>
                {isAdmin && (
                  <td>
                    {r.estado === 'PENDIENTE' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAutorizarReserva(r.id)}
                          disabled={accionEnCursoId === r.id}
                        >
                          {accionEnCursoId === r.id
                            ? 'Autorizando...'
                            : 'Autorizar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRechazarReserva(r.id)}
                          disabled={accionEnCursoId === r.id}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          {accionEnCursoId === r.id
                            ? 'Rechazando...'
                            : 'Rechazar'}
                        </button>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

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

/* ------------------------- Helper de explicación ------------------------ */

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
