import axios from 'axios'

const BASE = 'http://localhost:8000/api/auth'

export async function login(email: string, password: string) {
  // El backend espera: { email, password }
  const response = await axios.post(`${BASE}/login/`, {
    email,
    password,
  })
  return response.data as { access: string; refresh: string }
}

export async function registerApi(
  nombreCompleto: string,
  matricula: string,
  email: string,
  password: string
) {
  const response = await axios.post(`${BASE}/registro/`, {
    nombre_completo: nombreCompleto,
    matricula_o_empleado: matricula,
    email,
    password,
  })
  return response.data
}
