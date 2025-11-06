import { Router } from 'express'
import express from 'express'
import { createCheckoutSession, handleStripeWebhook, getCurrentUserSubscription, getAllSubscriptions } from '../controllers/subscription.controller'
import { auth } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'
const router = Router()

router.get('/', auth, authorize('admin'), getAllSubscriptions)
router.get('/me', auth, getCurrentUserSubscription)
router.post('/create-checkout-session', auth, createCheckoutSession)
// router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

export default router
