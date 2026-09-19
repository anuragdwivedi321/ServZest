import { Router } from 'express';
import { listServices, getServiceBySlug } from './services.controller';

const router = Router();

router.get('/', listServices);
router.get('/:slug', getServiceBySlug);

export default router;
