import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { authMiddleware } from '../middleware/auth';
import {
  getWorkspaceByOwner,
  getDocuments,
  getTrashedDocuments,
  createDocument,
  updateDocumentTitle,
  softDeleteDocument,
  restoreDocument,
  getDocumentById,
  permanentDeleteDocument,
  emptyTrash,
} from '../services/documentService';

const router = Router();

router.use(authMiddleware);

// GET / — list active documents
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await getWorkspaceByOwner(req.user!.id);
    const documents = await getDocuments(workspace.id);
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

// GET /trash — list trashed documents
router.get('/trash', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await getWorkspaceByOwner(req.user!.id);
    const documents = await getTrashedDocuments(workspace.id);
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

// GET /:id — get document by ID (any authenticated user — needed for shared document access)
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await getDocumentById(req.params.id);
    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(document);
  } catch (err) {
    next(err);
  }
});

// POST / — create document
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await getWorkspaceByOwner(req.user!.id);
    const title = (req.body as { title?: string }).title ?? 'Untitled';
    const document = await createDocument(workspace.id, req.user!.id, title);
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id — rename document
router.patch('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body as { title: string };
    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    const document = await updateDocumentTitle(req.params.id, title);
    res.json(document);
  } catch (err) {
    next(err);
  }
});

// DELETE /trash — empty trash (permanent delete all trashed docs)
router.delete('/trash', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await getWorkspaceByOwner(req.user!.id);
    await emptyTrash(workspace.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — soft delete
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await softDeleteDocument(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /:id/restore — restore from trash
router.post('/:id/restore', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await restoreDocument(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id/permanent — permanently delete a single document
router.delete('/:id/permanent', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await permanentDeleteDocument(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
