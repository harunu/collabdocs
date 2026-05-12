import { supabaseAdmin } from '../config/supabase';
import { Document, Workspace } from '../types/index';

export async function getWorkspaceByOwner(userId: string): Promise<Workspace> {
  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (error) throw new Error(`Failed to get workspace: ${error.message}`);
  return data as Workspace;
}

export async function getDocuments(workspaceId: string): Promise<Document[]> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Failed to get documents: ${error.message}`);
  return (data ?? []) as Document[];
}

export async function getTrashedDocuments(workspaceId: string): Promise<Document[]> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', true)
    .order('deleted_at', { ascending: false });

  if (error) throw new Error(`Failed to get trashed documents: ${error.message}`);
  return (data ?? []) as Document[];
}

export async function createDocument(
  workspaceId: string,
  ownerId: string,
  title: string
): Promise<Document> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({ workspace_id: workspaceId, owner_id: ownerId, title })
    .select()
    .single();

  if (error) throw new Error(`Failed to create document: ${error.message}`);
  return data as Document;
}

export async function updateDocumentTitle(id: string, title: string): Promise<Document> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .update({ title })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update document title: ${error.message}`);
  return data as Document;
}

export async function updateDocumentContent(
  id: string,
  content: Record<string, unknown>,
  ydocState?: Buffer
): Promise<void> {
  const updatePayload: Record<string, unknown> = { content };
  if (ydocState !== undefined) {
    updatePayload.ydoc_state = ydocState;
  }

  const { error } = await supabaseAdmin
    .from('documents')
    .update(updatePayload)
    .eq('id', id);

  if (error) throw new Error(`Failed to update document content: ${error.message}`);
}

export async function softDeleteDocument(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documents')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

export async function restoreDocument(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documents')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', id);

  if (error) throw new Error(`Failed to restore document: ${error.message}`);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get document: ${error.message}`);
  }
  return data as Document;
}

export async function permanentDeleteDocument(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to permanently delete document: ${error.message}`);
}

export async function emptyTrash(workspaceId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documents')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', true);

  if (error) throw new Error(`Failed to empty trash: ${error.message}`);
}
