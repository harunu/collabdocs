import { Request } from 'express';

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  owner_id: string;
  title: string;
  content: Record<string, unknown> | null;
  ydoc_state: Buffer | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  created_by: string;
  title: string;
  content: Record<string, unknown>;
  version_num: number;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
