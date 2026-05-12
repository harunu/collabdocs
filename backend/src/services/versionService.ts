import { supabaseAdmin } from '../config/supabase';
import { DocumentVersion } from '../types/index';
import { updateDocumentContent } from './documentService';

type VersionWithoutContent = Omit<DocumentVersion, 'content'>;

export async function createSnapshot(
  documentId: string,
  userId: string,
  title: string,
  content: Record<string, unknown>
): Promise<DocumentVersion> {
  // Get the last version to check for duplicates and get version_num
  const { data: lastVersions, error: fetchError } = await supabaseAdmin
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_num', { ascending: false })
    .limit(1);

  if (fetchError) throw new Error(`Failed to fetch versions: ${fetchError.message}`);

  const lastVersion = lastVersions?.[0] as DocumentVersion | undefined;

  // Skip if content is identical to last version
  if (lastVersion && JSON.stringify(lastVersion.content) === JSON.stringify(content)) {
    return lastVersion;
  }

  const nextVersionNum = (lastVersion?.version_num ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from('document_versions')
    .insert({
      document_id: documentId,
      created_by: userId,
      title,
      content,
      version_num: nextVersionNum,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create snapshot: ${error.message}`);
  return data as DocumentVersion;
}

export async function getVersions(documentId: string): Promise<VersionWithoutContent[]> {
  const { data, error } = await supabaseAdmin
    .from('document_versions')
    .select('id, document_id, created_by, title, version_num, created_at')
    .eq('document_id', documentId)
    .order('version_num', { ascending: false });

  if (error) throw new Error(`Failed to get versions: ${error.message}`);
  return (data ?? []) as VersionWithoutContent[];
}

export async function getVersionById(
  documentId: string,
  versionId: string
): Promise<DocumentVersion> {
  const { data, error } = await supabaseAdmin
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .eq('id', versionId)
    .single();

  if (error) throw new Error(`Failed to get version: ${error.message}`);
  return data as DocumentVersion;
}

export async function restoreVersion(
  documentId: string,
  versionId: string,
  userId: string
): Promise<void> {
  const version = await getVersionById(documentId, versionId);

  // Write version content back to document
  await updateDocumentContent(documentId, version.content);

  // Create a new snapshot marked as a restore
  await createSnapshot(documentId, userId, `Restored from v${version.version_num}`, version.content);
}
