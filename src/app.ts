import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import userRoutes from './routes/user.routes'
import quoteRoutes from './routes/quote.routes'
import subscriptionRoutes from './routes/subscription.routes'
import adminRoutes from './routes/admin.routes'
import companyRoutes from './routes/company.routes'
import { handleStripeWebhook } from './controllers/subscription.controller'
import path from 'path'

dotenv.config()
const app: Express = express()
const allowedOrigins = [process.env.ORIGIN, process.env.CLIENT_URL, 'http://localhost:5173', 'https://quotekite.elvirainfotech.org'].filter(Boolean)

const corsOptions = {
  // origin: process.env.ORIGIN,
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Check if the incoming origin is in our whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true) // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')) // Block the request
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

app.options('*', cors(corsOptions))
app.use(cors(corsOptions))
// app.use('/uploads', express.static(path.resolve('uploads')))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.post('/api/v1/subscriptions/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)
// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// --- API Routes ---
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the QuoteKite API!')
})
app.get('/test', (req: Request, res: Response) => {
  res.send('Welcome to the QuoteKite API! debugging')
})
app.get('/ping', (req: Request, res: Response) => {
  res.send('QuoteKite Says => Pong!')
})
app.all('/api/v1/debug-vgs', (req: Request, res: Response) => {
  const debugInfo = {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query,
    body: req.body,
  }

  console.log('===== Incoming VGS Request =====')
  console.log(JSON.stringify(debugInfo, null, 2))
  console.log('=================================')

  res.status(200).json({
    success: true,
    message: 'VGS debug endpoint received your request',
    received: debugInfo,
  })
})
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/quotes', quoteRoutes)
app.use('/api/v1/subscriptions', subscriptionRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/company', companyRoutes)

export default app
