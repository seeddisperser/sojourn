// Typed API client for the Sojourn server

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body)
const patch = <T>(path: string, body: unknown) => request<T>('PATCH', path, body)
const del = <T>(path: string) => request<T>('DELETE', path)

export const api = {
  auth: {
    login: (token: string, userName: string) => post<{ ok: boolean; userName: string }>('/api/auth/login', { token, userName }),
    logout: () => post<{ ok: boolean }>('/api/auth/logout', {}),
    me: () => get<{ userName: string }>('/api/auth/me'),
  },
  notes: {
    create: (title: string, content: string, tags?: string[]) => post('/api/notes', { title, content, tags }),
    get: (id: string) => get(`/api/notes/${id}`),
    update: (id: string, data: { title?: string; content?: string; tags?: string[] }) => patch(`/api/notes/${id}`, data),
  },
  images: {
    list: () => get('/api/images'),
    update: (id: string, data: { caption?: string; tags?: string[] }) => patch(`/api/images/${id}`, data),
    thumbnailUrl: (id: string) => `/api/images/${id}/thumbnail`,
    fullUrl: (id: string) => `/api/images/${id}/full`,
    upload: async (file: File): Promise<unknown> => {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/images/upload', { method: 'POST', body: form, credentials: 'include' })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).error ?? 'Upload failed') }
      return res.json()
    },
  },
  clusters: {
    create: (title: string, memberIds: Array<{id: string; type: 'note'|'image'}>, description?: string) =>
      post('/api/clusters', { title, description, member_ids: memberIds }),
    get: (id: string) => get(`/api/clusters/${id}`),
    update: (id: string, data: object) => patch(`/api/clusters/${id}`, data),
  },
  specs: {
    list: () => get('/api/specs'),
    create: (title: string, sourceClusterIds: string[]) => post('/api/specs', { title, source_cluster_ids: sourceClusterIds }),
    get: (id: string) => get(`/api/specs/${id}`),
    update: (id: string, data: { title?: string; body_json?: string; status?: string }) => patch(`/api/specs/${id}`, data),
  },
  comments: {
    list: (artifactId: string, artifactType: string) => get(`/api/comments?artifact_id=${artifactId}&artifact_type=${artifactType}`),
    create: (artifactId: string, artifactType: string, body: string, parentId?: string) =>
      post('/api/comments', { artifact_id: artifactId, artifact_type: artifactType, body, parent_id: parentId }),
  },
  events: {
    list: (params?: { type?: string; place?: string; limit?: number; offset?: number }) => {
      const q = new URLSearchParams()
      if (params?.type) q.set('type', params.type)
      if (params?.place) q.set('place', params.place)
      if (params?.limit) q.set('limit', String(params.limit))
      if (params?.offset) q.set('offset', String(params.offset))
      return get<{ events: unknown[]; total: number }>(`/api/events?${q}`)
    },
  },
  builds: {
    list: () => get('/api/builds'),
    create: (command: string, specId?: string) => post('/api/builds', { command, spec_id: specId }),
    get: (id: string) => get(`/api/builds/${id}`),
    stop: (id: string) => del(`/api/builds/${id}`),
    createHingePoint: (buildId: string, description: string) => post(`/api/builds/${buildId}/hinge-points`, { description }),
    acknowledgeHingePoint: (buildId: string, hpId: string) => patch(`/api/builds/${buildId}/hinge-points/${hpId}/acknowledge`, {}),
  },
  artifacts: {
    list: () => get('/api/artifacts'),
    updatePosition: (id: string, artifactType: string, x: number, y: number) =>
      patch(`/api/card-positions/${id}`, { artifact_type: artifactType, canvas_x: x, canvas_y: y }),
    prune: (id: string, artifactType: string) => patch(`/api/artifacts/${id}/prune`, { artifact_type: artifactType }),
  },
}
