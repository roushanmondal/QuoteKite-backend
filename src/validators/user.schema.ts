import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    email: z.string().nonempty('Email is required').email('Not a valid email'),
    password: z.string().nonempty('Password is required').min(6, 'Password must be at least 6 characters long'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().nonempty('Email is required').email('Not a valid email'),
    password: z.string().nonempty('Password is required'),
  }),
})
