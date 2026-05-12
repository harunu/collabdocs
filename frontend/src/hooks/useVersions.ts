import { useState, useCallback } from 'react';
import { DocumentVersion } from '../types';
import * as api from '../lib/api';

interface UseVersionsReturn {
  versions: DocumentVersion[];
  loading: boolean;
  fetchVersions: (documentId: string) => Promise<void>;
  restoreVersion: (documentId: string, versionId: string) => Promise<void>;
}

export function useVersions(): UseVersionsReturn {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVersions = useCallback(async (documentId: string): Promise<void> => {
    setLoading(true);
    try {
      const data = await api.getVersions(documentId);
      setVersions(data);
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreVersion = useCallback(async (documentId: string, versionId: string): Promise<void> => {
    try {
      await api.restoreVersion(documentId, versionId);
    } catch (err) {
      console.error('Failed to restore version:', err);
      throw err;
    }
  }, []);

  return { versions, loading, fetchVersions, restoreVersion };
}
