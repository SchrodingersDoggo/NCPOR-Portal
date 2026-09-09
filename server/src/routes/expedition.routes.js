import express from 'express';
import * as expeditionController from '../controllers/expedition.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', expeditionController.listExpeditions);
router.get('/:id', expeditionController.getExpeditionById);
router.post('/', authenticate, authorize('researcher', 'comms_officer', 'admin'), expeditionController.createExpedition);
router.patch('/:id', authenticate, authorize('researcher', 'comms_officer', 'admin'), expeditionController.updateExpedition);
router.delete('/:id', authenticate, authorize('admin'), expeditionController.deleteExpedition);

export default router;
