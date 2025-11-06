import { Router } from 'express'
import express from 'express'
import { generateQuoteDraft, getQuoteHistory, finalizeQuoteStream, getQuoteSource, regenerateQuotePdf } from '../controllers/quote.controller'
import { auth } from '../middlewares/auth.middleware'
import {uploadQuoteFiles} from '../middlewares/upload.middleware'

const router = Router()

router.post(
  '/generate',
  auth,
  uploadQuoteFiles.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
  ]),
  generateQuoteDraft
)

router.get('/history', auth, getQuoteHistory)
router.post('/:quoteId/finalize-stream', auth, finalizeQuoteStream);
router.get('/:quoteId/source', auth, getQuoteSource);
router.put('/:quoteId/regenerate', auth, express.json(), regenerateQuotePdf);

export default router
