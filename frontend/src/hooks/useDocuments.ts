import { useState, useEffect, useCallback } from 'react';
import { Document } from '../types';
import * as api from '../lib/api';

interface UseDocumentsReturn {
  documents: Document[];
  trashedDocuments: Document[];
  loading: boolean;
  createDocument: (title?: string) => Promise<Document>;
  renameDocument: (id: string, title: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;
  permanentDeleteDocument: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
}

export function useDocuments(): UseDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [trashedDocuments, setTrashedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [docs, trashed] = await Promise.all([
        api.getDocuments(),
        api.getTrashedDocuments(),
      ]);
      setDocuments(docs);
      setTrashedDocuments(trashed);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll().catch(console.error);
  }, [fetchAll]);

  const createDocument = useCallback(async (title?: string): Promise<Document> => {
    // Optimistic: create placeholder
    const tempId = `temp-${Date.now()}`;
    const tempDoc: Document = {
      id: tempId,
      workspace_id: '',
      owner_id: '',
      title: title ?? 'Untitled',
      content: null,
      is_deleted: false,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDocuments((prev) => [tempDoc, ...prev]);

    try {
      const created = await api.createDocument(title);
      setDocuments((prev) => prev.map((d) => (d.id === tempId ? created : d)));
      return created;
    } catch (err) {
      // Revert on error
      setDocuments((prev) => prev.filter((d) => d.id !== tempId));
      throw err;
    }
  }, []);

  const renameDocument = useCallback(async (id: string, title: string): Promise<void> => {
    // Optimistic update
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, title } : d)));
    try {
      await api.renameDocument(id, title);
    } catch (err) {
      await fetchAll();
      throw err;
    }
  }, [fetchAll]);

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    // Optimistic: remove from active list
    const removed = documents.find((d) => d.id === id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (removed) {
      setTrashedDocuments((prev) => [{ ...removed, is_deleted: true, deleted_at: new Date().toISOString() }, ...prev]);
    }

    try {
      await api.deleteDocument(id);
    } catch (err) {
      await fetchAll();
      throw err;
    }
  }, [documents, fetchAll]);

  const restoreDocument = useCallback(async (id: string): Promise<void> => {
    const restored = trashedDocuments.find((d) => d.id === id);
    setTrashedDocuments((prev) => prev.filter((d) => d.id !== id));
    if (restored) {
      setDocuments((prev) => [{ ...restored, is_deleted: false, deleted_at: null }, ...prev]);
    }

    try {
      await api.restoreDocument(id);
    } catch (err) {
      await fetchAll();
      throw err;
    }
  }, [trashedDocuments, fetchAll]);

  const permanentDeleteDocument = useCallback(async (id: string): Promise<void> => {
    setTrashedDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.permanentDeleteDocument(id);
    } catch (err) {
      await fetchAll();
      throw err;
    }
  }, [fetchAll]);

  const emptyTrash = useCallback(async (): Promise<void> => {
    setTrashedDocuments([]);
    try {
      await api.emptyTrash();
    } catch (err) {
      await fetchAll();
      throw err;
    }
  }, [fetchAll]);

  return {
    documents,
    trashedDocuments,
    loading,
    createDocument,
    renameDocument,
    deleteDocument,
    restoreDocument,
    permanentDeleteDocument,
    emptyTrash,
    refreshDocuments: fetchAll,
  };
}
