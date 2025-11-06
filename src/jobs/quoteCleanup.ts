import cron from 'node-cron'
import { db } from '../models'
import { Op } from 'sequelize'
import fs from 'fs'
import path from 'path'
import { UserAttributes } from '../models/user.model'
import { SubscriptionAttributes } from '../models/subscription.model'

const User = db.User
const Subscription = db.Subscription
const Quote = db.Quote

const RETENTION_PERIODS = {
  free: 30,
  pro: 365,
  enterprise: 3 * 365,
}

const deleteOldQuotes = async () => {
  console.log('Running scheduled job: Deleting old quotes...')

  try {
    // Fetch all users and their active subscription
    const users = await User.findAll({
      include: [
        {
          model: Subscription,
          where: { status: 'active' },
          required: false,
        },
      ],
    })

    for (const user of users) {
      const userWithSubs = user as unknown as UserAttributes & { Subscriptions: SubscriptionAttributes[] }
      const plan = userWithSubs.Subscriptions[0]?.plan || 'free'
      const retentionDays = RETENTION_PERIODS[plan]

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      const oldQuotes = await Quote.findAll({
        where: {
          userId: user.id,
          createdAt: {
            [Op.lt]: cutoffDate,
          },
        },
      })

      if (oldQuotes.length > 0) {
        console.log(`[User ${user.id}] Found ${oldQuotes.length} old quote(s) to delete.`)

        for (const quote of oldQuotes) {
          if (quote.imageUrl && fs.existsSync(path.resolve(quote.imageUrl))) {
            fs.unlinkSync(path.resolve(quote.imageUrl))
            console.log(`  - Deleted image: ${quote.imageUrl}`)
          }
          if (quote.pdfUrl && fs.existsSync(path.resolve(quote.pdfUrl))) {
            fs.unlinkSync(path.resolve(quote.pdfUrl))
            console.log(`  - Deleted PDF: ${quote.pdfUrl}`)
          }
        }

        await Quote.destroy({
          where: {
            id: oldQuotes.map((q) => q.id),
          },
        })
        console.log(`[User ${user.id}] Successfully deleted ${oldQuotes.length} quote records from the database.`)
      }
    }
  } catch (error) {
    console.error('Error during old quote cleanup job:', error)
  } finally {
    console.log('Quote cleanup job finished.')
  }
}

export const startQuoteCleanupJob = () => {
  // This cron expression means "at 0 minutes past the 0th hour, every day"
  cron.schedule('0 0 * * *', deleteOldQuotes, {
    timezone: 'UTC',
  })

  console.log('Quote cleanup job scheduled to run daily at midnight UTC.')
}
