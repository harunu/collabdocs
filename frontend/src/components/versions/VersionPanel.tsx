import { useEffect } from 'react';
import { useVersions } from '../../hooks/useVersions';
import { VersionItem } from './VersionItem';
import { Spinner } from '../ui/Spinner';

interface VersionPanelProps {
  documentId: string;
  onClose: () => void;
  onRestore: () => void;
}

export function VersionPanel({ documentId, onClose, onRestore }: VersionPanelProps) {
  const { versions, loading, fetchVersions, restoreVersion } = useVersions();

  useEffect(() => {
    fetchVersions(documentId).catch(console.error);
  }, [documentId, fetchVersions]);

  const handleRestore = async (versionId: string) => {
    try {
      await restoreVersion(documentId, versionId);
      onRestore();
    } catch {
      alert('Failed to restore version. Please try again.');
    }
  };

  return (
    <aside className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-sm text-gray-900">Version History</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No versions yet</p>
        ) : (
          versions.map((version) => (
            <VersionItem
              key={version.id}
              version={version}
              onRestore={(versionId) => handleRestore(versionId).catch(console.error)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
