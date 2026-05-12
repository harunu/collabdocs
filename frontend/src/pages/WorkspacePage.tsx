import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { useEditorStore } from '../store/editorStore';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Editor } from '../components/editor/Editor';
import { ShareModal } from '../components/editor/ShareModal';
import { VersionPanel } from '../components/versions/VersionPanel';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Document } from '../types';
import * as api from '../lib/api';

export function WorkspacePage() {
  const { documentId } = useParams<{ documentId?: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    documents,
    trashedDocuments,
    loading,
    createDocument,
    renameDocument,
    deleteDocument,
    restoreDocument,
    permanentDeleteDocument,
    emptyTrash,
    refreshDocuments,
  } = useDocuments();

  const { activeDocumentId, setActiveDocumentId, toggleSidebar, versionPanelOpen, toggleVersionPanel } =
    useEditorStore();

  const [shareModalOpen, setShareModalOpen] = useState(false);
  // Holds document metadata when the active doc belongs to another user's workspace
  const [sharedDoc, setSharedDoc] = useState<Document | null>(null);

  useEffect(() => {
    setActiveDocumentId(documentId ?? null);
    setSharedDoc(null);
  }, [documentId, setActiveDocumentId]);

  // When the active doc is not in the user's own workspace (shared link), fetch it by ID
  const activeDoc = documents.find((d) => d.id === activeDocumentId);
  useEffect(() => {
    if (!activeDocumentId || activeDoc) {
      setSharedDoc(null);
      return;
    }
    api.getDocumentById(activeDocumentId)
      .then((doc) => setSharedDoc(doc))
      .catch(() => setSharedDoc(null));
  }, [activeDocumentId, activeDoc]);

  // Close share modal if the document changes
  useEffect(() => {
    setShareModalOpen(false);
  }, [activeDocumentId]);

  const handleCreateDocument = async () => {
    try {
      const doc = await createDocument('Untitled');
      navigate(`/workspace/${doc.id}`);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    if (activeDocumentId === id) {
      navigate('/workspace');
    }
  };

  const handleVersionRestore = async () => {
    toggleVersionPanel();
    await refreshDocuments();
    // Force editor to reload by navigating away and back
    if (documentId) {
      navigate('/workspace');
      setTimeout(() => navigate(`/workspace/${documentId}`), 100);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar toggle — sits outside sidebar so it's always reachable */}
      <button
        onClick={toggleSidebar}
        className="fixed top-3 left-3 z-20 p-1.5 rounded hover:bg-gray-100 text-gray-400"
        title="Toggle sidebar"
      >
        ☰
      </button>

      <Sidebar
        documents={documents}
        trashedDocuments={trashedDocuments}
        onCreateDocument={() => handleCreateDocument().catch(console.error)}
        onRename={renameDocument}
        onDelete={handleDeleteDocument}
        onRestore={(id) => restoreDocument(id).catch(console.error)}
        onPermanentDelete={(id) => permanentDeleteDocument(id).catch(console.error)}
        onEmptyTrash={() => emptyTrash().catch(console.error)}
        workspaceName={user?.email ?? 'My Workspace'}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top nav */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          {/* Spacer for the fixed hamburger button */}
          <div className="w-8 shrink-0" />
          <div className="flex items-center gap-2">
            {activeDocumentId && (
              <>
                <Button variant="ghost" className="text-sm" onClick={() => setShareModalOpen(true)}>
                  🔗 Share
                </Button>
                <Button variant="ghost" className="text-sm" onClick={toggleVersionPanel}>
                  🕐 History
                </Button>
              </>
            )}
            <Button variant="ghost" className="text-sm" onClick={() => signOut().catch(console.error)}>
              Sign Out
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Editor area */}
          <div className="flex-1 overflow-hidden min-w-0">
            {activeDocumentId ? (
              <Editor
                key={activeDocumentId}
                documentId={activeDocumentId}
                initialTitle={activeDoc?.title ?? sharedDoc?.title ?? ''}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-4xl mb-4">📝</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">No document selected</h2>
                <p className="text-gray-400 mb-6">Choose a document from the sidebar or create a new one</p>
                {documents.length === 0 && (
                  <Button onClick={() => handleCreateDocument().catch(console.error)}>
                    Create New Document
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Version history panel */}
          {versionPanelOpen && activeDocumentId && (
            <VersionPanel
              documentId={activeDocumentId}
              onClose={toggleVersionPanel}
              onRestore={() => handleVersionRestore().catch(console.error)}
            />
          )}
        </div>
      </main>

      {/* Share modal */}
      {shareModalOpen && activeDocumentId && (
        <ShareModal documentId={activeDocumentId} onClose={() => setShareModalOpen(false)} />
      )}
    </div>
  );
}
