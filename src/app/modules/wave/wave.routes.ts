import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLE } from '../Auth/auth.constant';
import { WaveControllers } from './wave.controller';
import { WaveValidations } from './wave.validation';
import { upload } from '../../middleware/multer';


const router = express.Router();

router.post(
  '/create-wave',
  auth(USER_ROLE.student),
  upload.array('files', 5), 
  (req, res, next) => {
    if (req.body.body) {
      req.body = JSON.parse(req.body.body); 
    }
    next();
  },
  validateRequest(WaveValidations.createWaveZodSchema),
  WaveControllers.createWave
);
router.get('/stats', auth(USER_ROLE.student), WaveControllers.getWaveStats);
router.post('/ai-suggest', auth(USER_ROLE.student), WaveControllers.getAISuggestions);
router.post('/ai-confirm', auth(USER_ROLE.student), WaveControllers.confirmAIPlan);
router.post('/manual-setup', auth(USER_ROLE.student), validateRequest(WaveValidations.manualRippleSetupZodSchema), WaveControllers.setupManualRipples);
router.get('/my-waves', auth(USER_ROLE.student, USER_ROLE.teacher), WaveControllers.getMyWaves);
router.get(
  '/stats',
  auth(USER_ROLE.student),
  WaveControllers.getWaveStats
);
router.get('/:id', auth(USER_ROLE.student, USER_ROLE.teacher), WaveControllers.getSingleWave);
router.patch('/:id', auth(USER_ROLE.student), validateRequest(WaveValidations.updateWaveZodSchema), WaveControllers.updateWave);
router.delete('/:id', auth(USER_ROLE.student), WaveControllers.deleteWave);

export const WaveRoutes = router;