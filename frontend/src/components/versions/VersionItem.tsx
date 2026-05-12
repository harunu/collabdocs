import { useState } from 'react';
import { DocumentVersion } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface VersionItemProps {
  version: DocumentVersion;
  onRestore: (versionId: string) => void;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function VersionItem({ version, onRestore }: VersionItemProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    setConfirming(false);
    onRestore(version.id);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
        <div>
          <div className="text-sm font-medium text-gray-800">v{version.version_num}</div>
          <div className="text-xs text-gray-400">{formatDate(version.created_at)}</div>
        </div>
        <Button variant="secondary" className="text-xs py-1" onClick={() => setConfirming(true)}>
          Restore
        </Button>
      </div>

      {confirming && (
        <Modal title="Restore version?" onClose={() => setConfirming(false)}>
          <p className="text-sm text-gray-600 mb-6">
            Restoring <strong>v{version.version_num}</strong> will overwrite the current document
            content. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 font-medium"
            >
              Restore
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
