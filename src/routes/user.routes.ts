import { Router } from 'express'
import {
  registerUser,
  loginUser,
  getAllUsers,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
  updateUserProfile,
  verifyEmailChange,
  forgotPassword,
  resetPassword,
} from '../controllers/user.controller'
import { validate } from '../middlewares/zod.middleware'
import { registerSchema, loginSchema } from '../validators/user.schema'
import { auth } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'

const router = Router()

// Public routes
router.post('/register', validate(registerSchema), registerUser)
router.post('/login', validate(loginSchema), loginUser)
router.get('/me', auth, getCurrentUser)
router.post('/verify-email', verifyEmail)
router.post('/resend-verification', resendVerificationEmail)
router.put('/profile', auth, updateUserProfile)
router.get('/verify-email-change/:token', verifyEmailChange)
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
// Admin-only route
router.get('/', auth, authorize('admin'), getAllUsers)

export default router
