import { Document } from '../../types';
import { Button } from '../ui/Button';

interface TrashPanelProps {
  documents: Document[];
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
}

export function TrashPanel({ documents, onRestore, onPermanentDelete, onEmptyTrash }: TrashPanelProps) {
  if (documents.length === 0) {
    return <p className="text-xs text-gray-400 px-3 py-2">Trash is empty</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-end px-3 py-1">
        <button
          className="text-xs text-red-500 hover:text-red-700 hover:underline"
          onClick={onEmptyTrash}
          title="Permanently delete all trashed documents"
        >
          Empty Trash
        </button>
      </div>
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-100 rounded-md group">
          <span className="text-sm text-gray-500 truncate flex-1 mr-2">{doc.title}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              className="text-xs py-0.5 px-1.5"
              onClick={() => onRestore(doc.id)}
            >
              Restore
            </Button>
            <button
              className="text-xs text-red-500 hover:text-red-700 py-0.5 px-1.5 rounded hover:bg-red-50"
              onClick={() => onPermanentDelete(doc.id)}
              title="Delete permanently"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
