const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // Media
  uploadVideo: async (file: File) => {
    const form = new FormData();
    form.append('video', file);
    const res = await fetch(`${BASE}/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  getMedia: () => request<any[]>('/upload'),
  getStreamUrl: (id: string) => `/api/upload/${id}/stream`,

  // Projects
  createProject: (name: string) => request<any>('/projects', { method: 'POST', body: JSON.stringify({ name }) }),
  listProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  updateProject: (id: string, data: any) => request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => request<any>(`/projects/${id}`, { method: 'DELETE' }),

  // AI
  executePrompt: (prompt: string, timeline: any, mediaIds: string[]) =>
    request<any>('/ai/execute', { method: 'POST', body: JSON.stringify({ prompt, timeline, mediaIds }) }),

  // Export
  startExport: (timeline: any, mediaFiles: any[], settings: any) =>
    request<any>('/export', { method: 'POST', body: JSON.stringify({ timeline, mediaFiles, settings }) }),
  getExportStatus: (jobId: string) => request<any>(`/export/${jobId}/status`),
  getExportDownloadUrl: (jobId: string) => `${BASE}/export/${jobId}/download`,
};
