import { Router } from 'express'
import { getCompanyProfile, upsertCompanyProfile } from '../controllers/company.controller'
import { auth } from '../middlewares/auth.middleware'
import { uploadLogo } from '../middlewares/upload.middleware';

const router = Router()

router.get('/profile', auth, getCompanyProfile)
router.put('/profile', auth, uploadLogo.single('logo'), upsertCompanyProfile)

export default router
