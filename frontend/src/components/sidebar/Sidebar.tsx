import { useState } from 'react';
import { clsx } from 'clsx';
import { useEditorStore } from '../../store/editorStore';
import { Document } from '../../types';
import { DocumentItem } from './DocumentItem';
import { TrashPanel } from './TrashPanel';
import { Button } from '../ui/Button';

interface SidebarProps {
  documents: Document[];
  trashedDocuments: Document[];
  onCreateDocument: () => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  workspaceName: string;
}

export function Sidebar({
  documents,
  trashedDocuments,
  onCreateDocument,
  onRename,
  onDelete,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  workspaceName,
}: SidebarProps) {
  const { activeDocumentId, sidebarOpen } = useEditorStore();
  const [trashOpen, setTrashOpen] = useState(false);

  return (
    <aside
      className={clsx(
        'flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-200 shrink-0',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header — left-padded to clear the fixed ☰ toggle button */}
        <div className="pl-10 pr-4 py-3 border-b border-gray-200 min-w-0">
          <div className="font-bold text-gray-900 text-sm leading-tight">collabdocs</div>
          <div className="text-xs text-gray-500 truncate min-w-0" title={workspaceName}>
            {workspaceName}
          </div>
        </div>

        {/* New Document Button */}
        <div className="px-3 py-2">
          <Button variant="ghost" className="w-full text-left text-sm" onClick={onCreateDocument}>
            + New Document
          </Button>
        </div>

        {/* Document List */}
        <nav className="flex-1 overflow-y-auto px-2">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-2">No documents yet</p>
          ) : (
            documents.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                isActive={activeDocumentId === doc.id}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))
          )}
        </nav>

        {/* Trash */}
        <div className="border-t border-gray-200 px-2 py-2">
          <button
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-md"
            onClick={() => setTrashOpen((o) => !o)}
          >
            <span>🗑 Trash</span>
            <span className="text-xs">{trashOpen ? '▲' : '▼'}</span>
          </button>
          {trashOpen && (
            <TrashPanel
              documents={trashedDocuments}
              onRestore={onRestore}
              onPermanentDelete={onPermanentDelete}
              onEmptyTrash={onEmptyTrash}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
