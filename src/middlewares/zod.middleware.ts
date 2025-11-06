import { Request, Response, NextFunction } from 'express'
import { ZodError, z } from 'zod'
import ApiResponse from '../utils/apiResponse'

export const validate = (schema: z.Schema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    return next()
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Zod Validation Error:', error.flatten())
      const firstError = error.errors[0]
      const errorMessage = `'${firstError.path.join('.')}' - ${firstError.message}`

      return ApiResponse.error(res, 400, errorMessage)
    }
    console.error('An unexpected error occurred in validation:', error)
    return ApiResponse.error(res, 500, 'Internal Server Error')
  }
}
