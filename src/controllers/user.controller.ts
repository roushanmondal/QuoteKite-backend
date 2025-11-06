import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../models'
import ApiResponse from '../utils/apiResponse'
import crypto from 'crypto'
import { getVerificationEmailTemplate } from '../emailTemplates/verificationEmail'
import { Op } from 'sequelize'
import { getWelcomeEmailTemplate } from '../emailTemplates/welcomeEmail'
import { getEmailChangeTemplate } from '../emailTemplates/changeEmail'
import { getPasswordResetEmailTemplate } from '../emailTemplates/resetPasswordEmail'
import { sendEmail } from '../services/emailService'
import { UserAttributes } from '../models/user.model'
import { CompanyProfileAttributes } from '../models/company.model'

const User = db.User
const Subscription = db.Subscription
const CompanyProfile = db.CompanyProfile
const sequelize = db.sequelize

interface UserWithProfile extends UserAttributes {
  companyProfile?: CompanyProfileAttributes
}
interface EmailChangePayload extends jwt.JwtPayload {
  userId: number
  newEmail: string
}

// @route POST /api/users/register
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, subscribeToMarketing, companyName, companyAddress, companyPhone, termsAndConditions } = req.body
    console.log(`Sign Up attempt for email: ${email}`)

    const userExists = await User.findOne({ where: { email } })

    if (userExists) {
      console.warn(`Registration failed: Email ${email} already in use.`)
      return ApiResponse.error(res, 409, `An account with this email already exists: ${email}`)
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    const user = await sequelize.transaction(async (t) => {
      // Create the user within the transaction
      const newUser = await User.create(
        { firstName, lastName, email, password: hashedPassword, isSubscribedToMarketing: !!subscribeToMarketing },
        { transaction: t }
      )
      // create the associated company profile within the same transaction
      await CompanyProfile.create(
        {
          name: companyName,
          address: companyAddress,
          phone: companyPhone,
          email: email,
          termsAndConditions: termsAndConditions,
          userId: newUser.id,
        },
        { transaction: t }
      )
      // Generate and save the verification token within the transaction
      const verificationToken = crypto.randomBytes(32).toString('hex')
      newUser.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex')
      newUser.emailVerificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      await newUser.save({ transaction: t })
      return { user: newUser, verificationToken }
    })
    // sending mail
    const { subject, html } = getVerificationEmailTemplate({ token: user.verificationToken })
    sendEmail({
      to: user.user.email,
      subject: subject,
      html: html,
    })
    console.log(`User ${email} registered. Awaiting email verification.`)
    return ApiResponse.success(res, 201, {}, 'Registration successful. Please check your email to verify your account.')
  } catch (error) {
    console.error('[Register Error] An unexpected error occurred', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred. Please try again later.')
  }
}

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    console.log('Hashed Token for DB Lookup:', hashedToken)

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiresAt: { [Op.gt]: new Date() },
      },
      include: [{ model: CompanyProfile, as: 'companyProfile' }],
    })

    if (!user) {
      console.warn('Invalid or expired email verification token attempted.')
      return ApiResponse.error(res, 400, 'Invalid or expired verification link.')
    }

    user.isEmailVerified = true
    user.emailVerificationToken = null
    user.emailVerificationTokenExpiresAt = null
    await user.save()

    console.log(`Email verified successfully for user: ${user.email}`)
    try {
      if (user.isSubscribedToMarketing) {
        const welcomeEmailHtml = getWelcomeEmailTemplate({ firstName: user.firstName })
        sendEmail({
          to: user.email,
          subject: 'Welcome to QuoteKite!',
          html: welcomeEmailHtml,
        })
      }
    } catch (error) {
      console.error(`Failed to send welcome email to ${user.email}:`, error)
    }
    const profile = (user as UserWithProfile).companyProfile
    const isProfileIncomplete =
      !profile || !profile.name || !profile.address || !profile.email || !profile.website || !profile.logoUrl || !profile.termsAndConditions
    console.log(`User ${user.id} auto-logged in. Profile incomplete: ${isProfileIncomplete}`)

    // Log the user in automatically by sending back a JWT
    const jwtToken = jwt.sign({ id: user.id, role: user.role, firstName: user.firstName }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    })

    const loginData = { id: user.id, email: user.email, token: jwtToken, isProfileIncomplete: isProfileIncomplete }

    return ApiResponse.success(res, 200, loginData, 'Email verified successfully. You are now logged in.')
  } catch (error) {
    console.error('[Verify Email Error]', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred.')
  }
}

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ where: { email } })

    if (!user) {
      console.log(`Resend verification requested for non-existent user: ${email}`)
      return ApiResponse.success(res, 200, {}, 'If an account with that email exists, a new verification link has been sent.')
    }

    if (user.isEmailVerified) {
      return ApiResponse.error(res, 400, 'This account has already been verified.')
    }

    // Generate and save a new token and expiration
    const verificationToken = crypto.randomBytes(32).toString('hex')
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex')
    user.emailVerificationTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    await user.save()

    // re-send the verification email
    const { subject, html } = getVerificationEmailTemplate({ token: verificationToken })

    sendEmail({
      to: user.email,
      subject: subject,
      html: html,
    })

    console.log(`Resent verification email to: ${email}`)
    return ApiResponse.success(res, 200, {}, `A new verification link has been sent to this email: ${email}.`)
  } catch (error) {
    console.error('[Resend Verification Error]', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred.')
  }
}

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    console.log(`Login attempt for email: ${email}`)
    const user = (await User.findOne({ where: { email }, include: [{ model: CompanyProfile, as: 'companyProfile' }] })) as UserWithProfile | null
    const isMatch = user ? await bcrypt.compare(password, user.password) : false

    if (!user) {
      return ApiResponse.error(res, 404, 'No user exists with this email. Please Sign Up!')
    }

    if (!isMatch) {
      return ApiResponse.error(res, 401, 'Incorrect password.')
    }

    if (!user.isEmailVerified && user.role !== 'admin') {
      console.warn(`Login failed for ${email}: Email not verified.`)
      return res.status(403).json({
        success: true,
        message: 'Please verify email address before logging in.',
        errorCode: 'EMAIL_NOT_VERIFIED',
      })
    }
    const profile = user.companyProfile
    const isProfileIncomplete =
      !profile ||
      !profile.name ||
      !profile.address ||
      !profile.phone ||
      !profile.email ||
      !profile.website ||
      !profile.logoUrl ||
      !profile.termsAndConditions
    console.log(`User ${user.id} logged in. Profile incomplete: ${isProfileIncomplete}`)

    const token = jwt.sign({ id: user.id, role: user.role, firstName: user.firstName, lastName: user.lastName }, process.env.JWT_SECRET!, {
      expiresIn: '30d',
    })
    const loginData = { id: user.id, email: user.email, token, isProfileIncomplete: isProfileIncomplete }
    console.log(`User ${user.isEmailVerified} logged in successfully.`)
    return ApiResponse.success(res, 200, loginData, 'Login successful')
  } catch (error) {
    console.error('[Login Error] An unexpected error occurred:', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred. Please try again later.')
  }
}

export const getAllUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1
  const limit = parseInt(req.query.limit as string, 10) || 10
  const offset = (page - 1) * limit

  try {
    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Subscription,
          where: { status: 'active' },
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset,
      distinct: true,
    })

    return ApiResponse.success(
      res,
      200,
      {
        users: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalUsers: count,
      },
      'Users retrieved successfully'
    )
  } catch (error) {
    console.error('An unexpected error occurred:', error)
    return ApiResponse.error(res, 500, 'Server error')
  }
}

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
    })

    if (!user) {
      return ApiResponse.error(res, 404, 'User not found.')
    }

    return ApiResponse.success(res, 200, user, 'User profile retrieved successfully.')
  } catch (error) {
    console.error('An unexpected error occurred while fetching user profile:', error)
    return ApiResponse.error(res, 500, 'Server error')
  }
}

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return ApiResponse.error(res, 401, 'Unauthorized: No user session found.')
    }
    const { firstName, lastName, email } = req.body
    const userId = req.user!.id

    const user = await User.findByPk(userId)
    if (!user) {
      return ApiResponse.error(res, 404, 'User not found.')
    }

    if (email && email.toLowerCase() !== user.email) {
      console.log(`[updateUserProfile] Initiating email change for user ID: ${userId} from ${user.email} to ${email.toLowerCase()}`)
      const secret = process.env.JWT_SECRET
      if (!secret) {
        console.error('[updateUserProfile] FATAL: JWT_SECRET is not defined!')
        return ApiResponse.error(res, 500, 'Server configuration error.')
      }
      console.log(`[updateUserProfile] Using JWT_SECRET starting with: ${secret.substring(0, 5)}...`)
      const payload = {
        userId: user.id,
        newEmail: email.toLowerCase(),
      }
      const emailChangeToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' })
      const verificationUrl = `${process.env.BACKEND_URL}/api/v1/users/verify-email-change/${emailChangeToken}`

      console.log(`[updateUserProfile] Generated verification URL: ${verificationUrl}`)
      const { subject, html } = getEmailChangeTemplate({ verificationUrl })
      sendEmail({
        to: email.toLowerCase(),
        subject: subject,
        html: html,
      })
      user.firstName = firstName
      user.lastName = lastName
      await user.save()

      return ApiResponse.success(res, 200, user, 'Profile updated. Please check your new email to verify the address change.')
    } else {
      console.log(`[updateUserProfile] Updating profile (no email change) for user ID: ${userId}`)
      user.firstName = firstName
      user.lastName = lastName
      await user.save()
      return ApiResponse.success(res, 200, user, 'Profile updated successfully.')
    }
  } catch (error: any) {
    console.error('Profile update error:', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred.')
  }
}

export const verifyEmailChange = async (req: Request, res: Response) => {
  try {
    console.log('[verifyEmailChange] Endpoint hit. Attempting to verify email change.')
    const token = req.params.token
    if (!token) {
      console.error('[verifyEmailChange] No token provided in request.')
      return res.status(400).send('Verification token is missing.')
    }
    console.log(`[verifyEmailChange] Token received: ${token.substring(0, 15)}...`)

    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('[verifyEmailChange] FATAL: JWT_SECRET is not defined!')
      return res.status(500).send('Server configuration error.')
    }
    console.log(`[verifyEmailChange] Using JWT_SECRET starting with: ${secret.substring(0, 5)}...`)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as EmailChangePayload
    console.log(`[verifyEmailChange] Token decoded successfully. Payload:`, decoded)
    const user = await User.findByPk(decoded.userId)
    if (!user) {
      console.error(`[verifyEmailChange] Invalid token: User with ID ${decoded.userId} could not be found.`)
      return res.status(400).send('Invalid token: User could not be found.')
    }
    user.email = decoded.newEmail
    await user.save()
    console.log(`[verifyEmailChange] Email for user ID ${user.id} successfully updated.`)
    res.redirect(`${process.env.CLIENT_URL}/dashboard/settings`)
  } catch (error) {
    console.error('[verifyEmailChange] An error occurred during token verification:', error)
    if (error instanceof jwt.TokenExpiredError) {
      console.error('Email change verification failed: Token has expired.')
      res.status(400).send('This verification link has expired. Please try again.')
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('Email change verification failed: Token is invalid.', error.message)
      res.status(400).send('This verification link is invalid. Please try again.')
    } else {
      console.error('An unexpected error occurred during email verification:', error)
      res.status(500).send('An internal server error occurred.')
    }
  }
}

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body

  try {
    const user = await User.findOne({ where: { email } })
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`)
      return ApiResponse.success(res, 200, {}, 'If an account with that email exists, a password reset link has been sent.')
    }

    const resetToken = crypto.randomBytes(32).toString('hex')

    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // Token is valid for 10 minutes

    await user.save()

    const { subject, html } = getPasswordResetEmailTemplate({ token: resetToken })
    sendEmail({
      to: user.email,
      subject: subject,
      html: html,
    })

    return ApiResponse.success(res, 200, {}, 'If an account with that email exists, a password reset link has been sent.')
  } catch (error) {
    console.error('[Forgot Password Error]:', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred. Please try again later.')
  }
}

export const resetPassword = async (req: Request, res: Response) => {
  const { password, confirmPassword } = req.body
  const { token } = req.params

  try {
    // 1. Hash the incoming token to find it in the database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    // 2. Find the user by the hashed token and check if it's expired
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiresAt: { [Op.gt]: new Date() }, // Check that the token is not expired
      },
    })

    // 3. If token is invalid or expired, send an error
    if (!user) {
      return ApiResponse.error(res, 400, 'Token is invalid or has expired.')
    }

    // 4. Validate new password
    if (password !== confirmPassword) {
      return ApiResponse.error(res, 400, 'Passwords do not match.')
    }
    if (password.length < 8) {
      return ApiResponse.error(res, 400, 'Password must be at least 8 characters long.')
    }

    // 5. Hash new password and clear the reset token fields
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(password, salt)
    user.passwordResetToken = null
    user.passwordResetTokenExpiresAt = null

    await user.save()

    return ApiResponse.success(res, 200, {}, 'Password has been reset successfully.')
  } catch (error) {
    console.error('[Reset Password Error]:', error)
    return ApiResponse.error(res, 500, 'An internal server error occurred.')
  }
}
