// Cliente mínimo para la API. La cookie de sesión (httpOnly) viaja sola.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Error inesperado');
  return data;
}

export const api = {
  me: () => request('GET', '/auth/me'),
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  logout: () => request('POST', '/auth/logout'),
  rooms: () => request('GET', '/rooms'),
  createRoom: (data) => request('POST', '/rooms', data),
  room: (id) => request('GET', `/rooms/${id}`),
  addStudent: (roomId, data) => request('POST', `/rooms/${roomId}/students`, data),
  student: (id) => request('GET', `/students/${id}`),
  updateStudent: (id, data) => request('PATCH', `/students/${id}`, data),
  deleteStudent: (id) => request('DELETE', `/students/${id}`),
};
