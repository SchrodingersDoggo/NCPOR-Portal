import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/generate', authenticate, authorize('researcher', 'comms_officer', 'admin'), aiController.generate);
router.patch('/:id/edit', authenticate, authorize('comms_officer', 'admin'), aiController.editGeneration);
router.patch('/:id/publish', authenticate, authorize('comms_officer', 'admin'), aiController.publishGeneration);

export default router;
