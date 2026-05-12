import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import CodeBlock from '@tiptap/extension-code-block';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { supabase } from '../../lib/supabase';
import { SlashCommands } from './SlashCommands';
import { EditorToolbar } from './EditorToolbar';
import { PresenceBar } from './PresenceBar';
import { renameDocument } from '../../lib/api';

const COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#d97706',
  '#059669', '#0891b2', '#0284c7',
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface EditorProps {
  documentId: string;
  /** Pre-filled title from the document record. */
  initialTitle: string;
}

export function Editor({ documentId, initialTitle }: EditorProps) {
  // Single Y.Doc shared between the Tiptap editor and the Hocuspocus provider
  // so local edits are immediately visible to the provider and vice-versa.
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  const providerRef = useRef<HocuspocusProvider | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Reactive state — providerRef alone won't trigger re-renders.
  const [liveProvider, setLiveProvider] = useState<HocuspocusProvider | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // In production VITE_WS_URL points to the Railway backend (wss://…).
  // Locally the Vite dev-server proxy forwards /ws → backend:3001/ws.
  const wsUrl = import.meta.env.VITE_WS_URL || (() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  })();

  useEffect(() => {
    setConnectionStatus('connecting');
    setLiveProvider(null);

    let destroyed = false;

    supabase.auth.getSession().then(({ data }) => {
      if (destroyed) return;

      const token = data.session?.access_token ?? '';
      const userEmail = data.session?.user?.email ?? 'Anonymous';
      setCurrentUserEmail(userEmail);

      const provider = new HocuspocusProvider({
        url: wsUrl,
        name: `document-${documentId}`,
        document: ydoc,
        token,
        onConnect() {
          setConnectionStatus('connected');
        },
        onDisconnect() {
          setConnectionStatus('disconnected');
        },
        onClose() {
          setConnectionStatus('disconnected');
        },
      });

      provider.awareness?.setLocalStateField('user', {
        name: userEmail,
        color: randomColor(),
      });

      providerRef.current = provider;
      setLiveProvider(provider);
    }).catch((err) => {
      console.error('[Editor] provider init error:', err);
      setConnectionStatus('error');
    });

    return () => {
      destroyed = true;
      providerRef.current?.destroy();
      providerRef.current = null;
      setLiveProvider(null);
      setConnectionStatus('disconnected');
    };
  }, [documentId, wsUrl, ydoc]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      CodeBlock,
      Collaboration.configure({ document: ydoc }),
      Placeholder.configure({ placeholder: "Type '/' for commands..." }),
      SlashCommands,
    ],
  }, [documentId]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    titleTimerRef.current = setTimeout(() => {
      renameDocument(documentId, title || 'Untitled').catch(console.error);
    }, 1500);
  }, [documentId]);

  // On unmount or document switch: flush any pending title save instead of discarding it
  useEffect(() => {
    return () => {
      if (titleTimerRef.current) {
        clearTimeout(titleTimerRef.current);
        const pendingTitle = titleRef.current?.value;
        if (pendingTitle !== undefined) {
          renameDocument(documentId, pendingTitle || 'Untitled').catch(console.error);
        }
      }
    };
  }, [documentId]);

  const statusColor: Record<ConnectionStatus, string> = {
    connecting: 'bg-yellow-400',
    connected: 'bg-green-500',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor top bar: connection status + presence avatars */}
      <div className="flex items-center justify-between px-8 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${statusColor[connectionStatus]}`}
            title={connectionStatus}
          />
          <span className="text-xs text-gray-400">{connectionStatus}</span>
        </div>
        {liveProvider && (
          <PresenceBar provider={liveProvider} ownEmail={currentUserEmail} />
        )}
      </div>

      {/* Formatting toolbar */}
      {editor && <EditorToolbar editor={editor} />}

      {/* Document title — pre-filled from DB, saved on change */}
      <div className="px-8 pt-8 pb-2">
        <input
          ref={titleRef}
          key={documentId}
          defaultValue={initialTitle}
          className="w-full text-4xl font-bold text-gray-900 outline-none placeholder-gray-300 bg-transparent"
          placeholder="Untitled"
          onChange={handleTitleChange}
        />
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <EditorContent editor={editor} className="min-h-full prose max-w-none" />
      </div>
    </div>
  );
}
