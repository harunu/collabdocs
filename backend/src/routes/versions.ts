import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/index';
import { authMiddleware } from '../middleware/auth';
import { getVersions, getVersionById, restoreVersion } from '../services/versionService';

const router = Router();

router.use(authMiddleware);

// GET /:documentId — list versions (no content field)
router.get('/:documentId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const versions = await getVersions(req.params.documentId);
    res.json(versions);
  } catch (err) {
    next(err);
  }
});

// GET /:documentId/:versionId — get single version with content
router.get('/:documentId/:versionId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const version = await getVersionById(req.params.documentId, req.params.versionId);
    res.json(version);
  } catch (err) {
    next(err);
  }
});

// POST /:documentId/:versionId/restore — restore document to this version
router.post('/:documentId/:versionId/restore', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await restoreVersion(req.params.documentId, req.params.versionId, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
