import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../models'
import ApiResponse from '../utils/apiResponse'

const User = db.User

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  let token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number
      }
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] },
      })

      if (!user) {
        return ApiResponse.error(res, 401, 'Not authorized, user not found')
      }
      // Checking if the user is blocked.
      if (user.status === false && user.role !== 'admin') {
        console.warn(`Blocked user attempt: User ID ${user.id} tried to access a protected route.`)
        return res.status(403).json({
          success: false,
          message: 'Your account has been blocked. Please contact the Administrator.',
          errorCode: 'ACCOUNT_BLOCKED'
        })
      }

      req.user = user.get({ plain: true })
      next()
    } catch (error) {
      console.log('----', error)
      return ApiResponse.error(res, 401, 'Not authorized, token failed')
    }
  }

  // If there's no token at all
  if (!token) {
    return ApiResponse.error(res, 401, 'Not authorized, no token provided')
  }
}
