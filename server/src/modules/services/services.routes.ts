import { asyncHandler } from '../../middlewares/async.middleware';
import { Router } from 'express';
import { listServices, getServiceBySlug } from './services.controller';

const router = Router();

router.get('/', asyncHandler(listServices));
router.get('/:slug', asyncHandler(getServiceBySlug));

export default router;
