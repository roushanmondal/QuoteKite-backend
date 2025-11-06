import { Router } from 'express'
import { handleGetDashboardAnalytics, changeAdminPassword, editUser, updateUserStatus, deleteUser } from '../controllers/admin.controller'
import { auth } from '../middlewares/auth.middleware'
import { authorize } from '../middlewares/role.middleware'

const router = Router()

// Admin-only route
router.get('/dashboard', auth, authorize('admin'), handleGetDashboardAnalytics)
router.put('/change-password', auth, authorize('admin'), changeAdminPassword)
router.put('/users/:id', auth, authorize('admin'), editUser)
router.patch('/users/:id/status', auth, authorize('admin'), updateUserStatus)
router.delete('/users/:id', auth, authorize('admin'), deleteUser)

export default router
