// Thin fetch wrapper around the Umuturage-MIS Express API.
// Configure the backend URL with VITE_API_URL (defaults to the local dev server).

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const TOKEN_KEY = 'umuturage.token'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0, {})
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status}).`, res.status, data)
  return data
}

export const apiLogin = (identifier, password) =>
  request('/api/auth/login', { method: 'POST', auth: false, body: { identifier, password } })

export const apiBootstrap = () => request('/api/bootstrap')

// Anonymous for citizen/officer self-registration; sends the admin token when
// one exists so statistics accounts can be created by an administrator.
export const apiCreateAccount = (payload) =>
  request('/api/accounts', { method: 'POST', body: payload })

export const apiUpdateAccount = (uid, patch) =>
  request(`/api/accounts/${uid}`, { method: 'PATCH', body: patch })

export const apiDeleteAccount = (uid) =>
  request(`/api/accounts/${uid}`, { method: 'DELETE' })

export const apiAddRegistration = (loc) =>
  request('/api/registrations', { method: 'POST', body: loc })

export const apiSetRegistrationStatus = (uid, status) =>
  request(`/api/registrations/${uid}/status`, { method: 'PATCH', body: { status } })

export const apiAddDeregistration = () =>
  request('/api/deregistrations', { method: 'POST', body: {} })

export const apiSetDeregistrationStatus = (uid, status) =>
  request(`/api/deregistrations/${uid}/status`, { method: 'PATCH', body: { status } })

export const apiAddNotice = (notice) =>
  request('/api/notices', { method: 'POST', body: notice })

export const apiDeleteNotice = (uid) => request(`/api/notices/${uid}`, { method: 'DELETE' })

export const apiAddCommander = (commander) =>
  request('/api/commanders', { method: 'POST', body: commander })

export const apiDeleteCommander = (uid) => request(`/api/commanders/${uid}`, { method: 'DELETE' })
