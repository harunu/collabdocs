import { supabase } from './supabase';
import { Document, DocumentVersion } from '../types';

const API_URL = import.meta.env.VITE_API_URL as string;

async function getAuthToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(body.error ?? `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getDocuments(): Promise<Document[]> {
  return apiFetch<Document[]>('/api/documents');
}

export async function getTrashedDocuments(): Promise<Document[]> {
  return apiFetch<Document[]>('/api/documents/trash');
}

export async function createDocument(title?: string): Promise<Document> {
  return apiFetch<Document>('/api/documents', {
    method: 'POST',
    body: JSON.stringify({ title: title ?? 'Untitled' }),
  });
}

export async function renameDocument(id: string, title: string): Promise<Document> {
  return apiFetch<Document>(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export async function deleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/api/documents/${id}`, { method: 'DELETE' });
}

export async function restoreDocument(id: string): Promise<void> {
  return apiFetch<void>(`/api/documents/${id}/restore`, { method: 'POST' });
}

export async function getDocumentById(id: string): Promise<Document> {
  return apiFetch<Document>(`/api/documents/${id}`);
}

export async function permanentDeleteDocument(id: string): Promise<void> {
  return apiFetch<void>(`/api/documents/${id}/permanent`, { method: 'DELETE' });
}

export async function emptyTrash(): Promise<void> {
  return apiFetch<void>('/api/documents/trash', { method: 'DELETE' });
}

export async function getVersions(documentId: string): Promise<DocumentVersion[]> {
  return apiFetch<DocumentVersion[]>(`/api/versions/${documentId}`);
}

export async function getVersion(documentId: string, versionId: string): Promise<DocumentVersion> {
  return apiFetch<DocumentVersion>(`/api/versions/${documentId}/${versionId}`);
}

export async function restoreVersion(documentId: string, versionId: string): Promise<void> {
  return apiFetch<void>(`/api/versions/${documentId}/${versionId}/restore`, { method: 'POST' });
}
