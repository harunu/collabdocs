import { Server } from '@hocuspocus/server';
import * as Y from 'yjs';
import { supabaseAdmin } from '../config/supabase';
import { createSnapshot } from './versionService';

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const hocuspocusServer = Server.configure({
  async onAuthenticate(data) {
    const { token } = data;

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) throw new Error('Invalid token');
      return { id: user.id, email: user.email ?? '' };
    } catch {
      throw new Error('Invalid token');
    }
  },

  async onLoadDocument(data) {
    const documentId = data.documentName.replace('document-', '');

    try {
      const { data: doc, error } = await supabaseAdmin
        .from('documents')
        .select('ydoc_state')
        .eq('id', documentId)
        .single();

      if (error || !doc?.ydoc_state) return;

      const state = doc.ydoc_state as unknown;
      if (state && typeof state === 'object' && 'data' in state) {
        const buffer = Buffer.from((state as { data: number[] }).data);
        Y.applyUpdate(data.document, buffer);
      } else if (Buffer.isBuffer(state)) {
        Y.applyUpdate(data.document, state as Buffer);
      }
    } catch (err) {
      console.error('[Hocuspocus] onLoadDocument error:', err);
    }
  },

  async onStoreDocument(data) {
    const documentId = data.documentName.replace('document-', '');

    try {
      const state = Y.encodeStateAsUpdate(data.document);
      const stateBuffer = Buffer.from(state);

      await supabaseAdmin
        .from('documents')
        .update({ ydoc_state: stateBuffer })
        .eq('id', documentId);
    } catch (err) {
      console.error('[Hocuspocus] onStoreDocument error:', err);
    }
  },

  async onChange(data) {
    const documentId = data.documentName.replace('document-', '');

    const existingTimer = debounceTimers.get(documentId);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(async () => {
      debounceTimers.delete(documentId);

      try {
        const ydoc = data.document;
        const prosemirrorContent = ydoc.getXmlFragment('default');
        const content: Record<string, unknown> = {
          type: 'doc',
          content: prosemirrorContent.toArray().map((item) => item.toJSON()),
        };

        const { data: doc } = await supabaseAdmin
          .from('documents')
          .select('title, owner_id')
          .eq('id', documentId)
          .single();

        if (doc) {
          const ydocState = Buffer.from(Y.encodeStateAsUpdate(ydoc));
          await supabaseAdmin
            .from('documents')
            .update({ content, ydoc_state: ydocState })
            .eq('id', documentId);

          await createSnapshot(documentId, doc.owner_id as string, doc.title as string, content);
        }
      } catch (err) {
        console.error('[Hocuspocus] onChange debounce error:', err);
      }
    }, 3000);

    debounceTimers.set(documentId, timer);
  },
});
