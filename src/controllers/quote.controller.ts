import { Request, Response } from 'express'
import OpenAI from 'openai'
import { db } from '../models'
import ApiResponse from '../utils/apiResponse'
import fs from 'fs'
import { CompanyProfileAttributes } from "../models/company.model"
import { checkQuoteLimit } from '../utils/quoteLimit'
import { extractScopeOfWork } from '../services/quoteService'
import path from 'path'
import { savePdf } from '../services/quoteService'
import { generateDraftPdf, generateModernPdf } from '../utils/generatePdf'
import { sanitizeMarkdown } from '../services/quoteService'
import { sendEmail } from '../services/emailService'
import { getQuoteLimitReachedTemplate } from '../emailTemplates/quoteLimitReached'
import { callOpenAIFordraft } from '../services/quoteService'
import { callOpenAIForFinalStream } from '../services/quoteService'

const Quote = db.Quote
const CompanyProfile = db.CompanyProfile
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const generateQuoteDraft = async (req: Request, res: Response) => {
  const { jobDescription } = req.body
  const user = req.user!
  const userId = user.id
  const files = req.files as { [fieldname: string]: Express.Multer.File[] }
  const imageFile = files?.image?.[0]
  const audioFile = files?.audio?.[0]

  try {
    const { limitReached, quoteCount } = await checkQuoteLimit(user)
    if (limitReached) {
      sendEmail({
        to: user.email,
        subject: "You've reached your quote limit for the month",
        html: getQuoteLimitReachedTemplate({
          firstName: user.firstName,
          quoteLimit: 2,
        }),
      }).catch((err) => console.error(`Failed to send limit reached email to ${user.email}:`, err))
      return ApiResponse.error(res, 403, 'Your monthly quote limit has been reached.')
    }

    let fullJobDescription = jobDescription
    if (audioFile) {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.path),
        model: 'whisper-1',
      })
      fullJobDescription = transcription.text
    }

    if (!fullJobDescription) {
      return ApiResponse.error(res, 400, 'A job description is required.')
    }

    const aiContent = await callOpenAIFordraft(fullJobDescription, imageFile, userId)

    // Generate a placeholder PDF for the draft stage
    const companyProfile = await CompanyProfile.findOne({ where: { userId } })
    let logoBuffer: Buffer | undefined
    if (companyProfile && companyProfile.logoUrl) {
      try {
        // This robustly finds the logo file from its URL
        const url = new URL(companyProfile.logoUrl)
        const filename = path.basename(url.pathname)
        const relativePath = path.join('uploads', 'logos', filename)
        const logoPath = path.resolve(relativePath)

        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath)
        } else {
          console.warn(`[User ${userId}] Draft logo file not found at path: ${logoPath}`)
        }
      } catch (err) {
        console.error(`[User ${userId}] Error reading logo file for draft:`, err)
      }
    }
    const sanitizedDraftContent = sanitizeMarkdown(aiContent.pdfContent)
    const pdfBuffer = generateDraftPdf(sanitizedDraftContent, companyProfile, logoBuffer)
    const pdfUrl = savePdf(pdfBuffer, userId, aiContent.quoteTitle)
    const imageUrl = imageFile ? imageFile.path.replace(/\\/g, '/') : undefined

    const quote = await Quote.create({
      quoteTitle: aiContent.quoteTitle,
      jobDescription: fullJobDescription,
      generatedQuote: aiContent.pdfContent, // Store the draft content
      imageUrl,
      pdfUrl,
      userId,
    })

    return ApiResponse.success(
      res,
      201,
      {
        quoteId: quote.id,
        title: aiContent.quoteTitle,
        message: aiContent.shortMessage,
        pdfUrl: pdfUrl,
        pdf: pdfBuffer.toString('base64'),
        requiredInputs: aiContent.requiredInputs,
      },
      'Quote draft generated successfully'
    )
  } catch (error: any) {
    if (audioFile && fs.existsSync(audioFile.path)) fs.unlinkSync(audioFile.path)
    console.error(`[User ${userId}] A critical error occurred during quote draft generation:`, error)
    return ApiResponse.error(res, 500, error.message || 'An internal server error occurred.')
  }
}

export const getQuoteHistory = async (req: Request, res: Response) => {
  const user = req.user!
  const userId = user.id
  const page = parseInt(req.query.page as string, 10) || 1
  const limit = parseInt(req.query.limit as string, 10) || 10
  const offset = (page - 1) * limit
  console.log(`[User ${userId}] Fetching quote history for page ${page}...`)
  try {
    const { count, rows } = await Quote.findAndCountAll({
      where: { userId: userId },
      order: [['createdAt', 'DESC']],
      limit: limit,
      offset: offset,
    })
    console.log(`[User ${userId}] Found ${rows.length} quotes out of ${count} total.`)
    return ApiResponse.success(
      res,
      200,
      {
        quotes: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalQuotes: count,
      },
      'Quote history retrieved successfully'
    )
  } catch (error: any) {
    console.error(`[User ${userId}] Error fetching quote history:`, error)
    return ApiResponse.error(res, 500, 'An internal server error occurred while fetching quote history.')
  }
}

export const finalizeQuoteStream = async (req: Request, res: Response) => {
  console.log('started finalizing...')
  const { quoteId } = req.params
  const finalDetails = req.body
  const user = req.user!
  const userId = user.id
  console.log(`[API HIT] Finalize stream request received for Quote ID: ${quoteId} by User ID: ${userId}`)

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const sendEvent = (eventName: string, data: object) => {
    res.write(`event: ${eventName}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    // Fetch the existing draft quote from the database
    const quote = await Quote.findByPk(quoteId)
    if (!quote || quote.userId !== userId) {
      sendEvent('error', { message: 'Quote not found or permission denied.' })
      return res.end()
    }

    const preservedScopeOfWork = extractScopeOfWork(quote.generatedQuote)
    if (!preservedScopeOfWork) {
      const errorMessage = "Could not find 'Scope of work' in the original draft."
      console.error(`[User ${userId}] ${errorMessage} for Quote ID: ${quoteId}`)
      sendEvent('error', { message: errorMessage })
      return res.end()
    }

    let sitePhotoBuffer: Buffer | undefined
    if (quote.imageUrl) {
      try {
        const photoPath = path.resolve(quote.imageUrl)
        if (fs.existsSync(photoPath)) {
          sitePhotoBuffer = fs.readFileSync(photoPath)
        } else {
          console.warn(`[User ${userId}] Site photo not found at path: ${photoPath}`)
        }
      } catch (err) {
        console.error(`[User ${userId}] Error reading site photo file:`, err)
      }
    }

    console.log('Fetching company profile.')
    const companyProfile = await CompanyProfile.findOne({ where: { userId } })

    console.log('calling openai..')
    // Call the dedicated helper function to get the AI stream
    const stream = await callOpenAIForFinalStream(
      quote.jobDescription,
      finalDetails,
      companyProfile,
      userId,
      !!sitePhotoBuffer,
      quote.quoteTitle,
      preservedScopeOfWork
    )
    // Process the incoming stream
    let fullContent = ''
    let contentBuffer = ''
    const sectionDelimiter = '\n### '
    console.log('Processing stream...')
    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || ''
      fullContent += token
      contentBuffer += token

      if (contentBuffer.includes(sectionDelimiter)) {
        const sections = contentBuffer.split(sectionDelimiter)
        for (let i = 0; i < sections.length - 1; i++) {
          const sectionContent = sections[i]
          const title = sectionContent.trim().split('\n')[0].replace(/#/g, '').trim().toLowerCase().replace(/\s+/g, '_')
          sendEvent('section_completed', {
            title: title,
            content: (i === 0 ? '' : '### ') + sectionContent,
          })
        }
        contentBuffer = sections[sections.length - 1]
      }
    }

    if (contentBuffer.trim()) {
      const title = contentBuffer.trim().split('\n')[0].replace(/#/g, '').trim().toLowerCase().replace(/\s+/g, '_')
      sendEvent('section_completed', {
        title: title,
        content: '### ' + contentBuffer,
      })
    }

    let logoBuffer: Buffer | undefined
    if (companyProfile && companyProfile.logoUrl) {
      try {
        const url = new URL(companyProfile.logoUrl)
        const filename = path.basename(url.pathname)
        const relativePath = path.join('uploads', 'logos', filename)
        const logoPath = path.resolve(relativePath)

        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath)
        } else {
          console.warn(`[User ${userId}] Logo file not found at path: ${logoPath}`)
        }
      } catch (err) {
        console.error(`[User ${userId}] Error reading logo file:`, err)
      }
    }

    // Finalize, generate PDF, and update the quote in the database
    const sanitizedFinalContent = sanitizeMarkdown(fullContent)
    const pdfBuffer = generateModernPdf(sanitizedFinalContent, companyProfile, logoBuffer, sitePhotoBuffer, quote.imageUrl)
    // 1. Create the timestamp string
    const now = new Date()
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now
      .getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`

    // 2. Sanitize the company name for the filename
    const sanitizedCompanyName =
      companyProfile?.name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '') || 'quote'

    // 3. Construct the new filename base
    const filenameBase = `${sanitizedCompanyName}_${timestamp}`

    // 4. Use the new filenameBase instead of finalDetails.title
    const pdfUrl = savePdf(pdfBuffer, userId, filenameBase)
    // const pdfUrl = savePdf(pdfBuffer, userId, finalDetails.title)
    const fullPublicUrl = `${process.env.BACKEND_URL}/${pdfUrl}`

    await quote.update({
      quoteTitle: finalDetails.title || quote.quoteTitle,
      generatedQuote: fullContent,
      pdfUrl: fullPublicUrl,
    })
    console.log('Database updated.')
    sendEvent('done', {
      message: 'Quote has been finalized successfully.',
      quoteId: quote.id,
      pdfUrl: fullPublicUrl,
    })
    console.log('Quote finalized and event sent.')
    res.end()
  } catch (error: any) {
    console.error(`[User ${userId}] SSE Finalization Error:`, error)
    sendEvent('error', { message: error.message || 'An unknown error occurred.' })
    res.end()
  }
}

export const getQuoteSource = async (req: Request, res: Response) => {
  const user = req.user!
  const { quoteId } = req.params

  try {
    const quote = await Quote.findByPk(quoteId)
    if (!quote || quote.userId !== user.id) {
      return ApiResponse.error(res, 404, 'Quote not found or permission denied.')
    }
    const companyProfile = await CompanyProfile.findOne({ where: { userId: user.id } })

    return ApiResponse.success(res, 200, { markdown: quote.generatedQuote, terms: companyProfile?.termsAndConditions || '' }, 'Source text retrieved.')
  } catch (error) {
    console.error(`[User ${user.id}] Error fetching quote source for Quote ID ${quoteId}:`, error)
    return ApiResponse.error(res, 500, 'Failed to retrieve quote source')
  }
}

export const regenerateQuotePdf = async (req: Request, res: Response) => {
  const user = req.user!
  const { quoteId } = req.params
  const { updatedMarkdown, updatedTerms } = req.body

  try {
    const quote = await Quote.findByPk(quoteId)
    if (!quote || quote.userId !== user.id) {
      return ApiResponse.error(res, 404, 'Quote not found or permission denied.')
    }

    if (!updatedMarkdown) {
      return ApiResponse.error(res, 400, 'Content is required.')
    }

    const companyProfile = await CompanyProfile.findOne({ where: { userId: user.id } })
    
    // Create a temporary profile object for PDF generation
    // This ensures we don't modify the original database entry.
    let profileForPdf: Partial<CompanyProfileAttributes> = {}

    if (companyProfile) {
      profileForPdf = companyProfile.toJSON()
    }

    if (typeof updatedTerms === 'string') {
      profileForPdf.termsAndConditions = updatedTerms
    }

    let logoBuffer: Buffer | undefined
    if (companyProfile && companyProfile.logoUrl) {
      try {
        const url = new URL(companyProfile.logoUrl)
        const filename = path.basename(url.pathname)
        const relativePath = path.join('uploads', 'logos', filename)
        const logoPath = path.resolve(relativePath)
        if (fs.existsSync(logoPath)) {
          logoBuffer = fs.readFileSync(logoPath)
        }
      } catch (error) {
        console.error(`[User ${user.id}] Error reading logo file during regeneration:`, error)
      }
    }

    let sitePhotoBuffer: Buffer | undefined
    if (quote.imageUrl) {
      try {
        const photoPath = path.resolve(quote.imageUrl)
        if (fs.existsSync(photoPath)) {
          sitePhotoBuffer = fs.readFileSync(photoPath)
        } else {
          console.warn(`[User ${user.id}] Site photo not found at path: ${photoPath}`)
        }
      } catch (err) {
        console.error(`[User ${user.id}] Error reading site photo file:`, err)
      }
    }

    const pdfBuffer = generateModernPdf(updatedMarkdown, profileForPdf, logoBuffer, sitePhotoBuffer, quote.imageUrl)
    const pdfUrl = savePdf(pdfBuffer, user.id, quote.quoteTitle)
    const fullPublicUrl = `${process.env.BACKEND_URL}/${pdfUrl}`

    await quote.update({
      generatedQuote: updatedMarkdown,
      pdfUrl: fullPublicUrl,
    })
    return ApiResponse.success(res, 200, { newPdfUrl: fullPublicUrl }, 'PDF regenerated successfully.')
  } catch (error) {
    console.error(`[User ${user.id}] Error regenerating PDF for Quote ID ${quoteId}:`, error)
    return ApiResponse.error(res, 500, 'Failed to regenerate PDF.')
  }
}
