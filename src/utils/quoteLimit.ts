import { Op } from 'sequelize'
import Subscription from '../models/subscription.model'
import Quote from '../models/quote.model'
import { UserAttributes } from '../models/user.model'

const FREE_TIER_QUOTE_LIMIT = 2
const ACTIVE_PLAN_STATUSES = ['active']

interface QuoteLimitStatus {
  limitReached: boolean
  quoteCount: number
}

export const checkQuoteLimit = async (user: UserAttributes): Promise<QuoteLimitStatus> => {
  const now = new Date()

  // Get the latest subscription by periodEndsAt
  const subscription = await Subscription.findOne({
    where: { userId: user.id },
    order: [['periodEndsAt', 'DESC']],
  })

  let isPaidUser = false

  if (subscription) {
    const { status, periodEndsAt } = subscription

    // Only active is considered paid
    if (ACTIVE_PLAN_STATUSES.includes(status) && new Date(periodEndsAt) > now) {
      isPaidUser = true
    }
  }

  // If paid, no limit
  if (isPaidUser) {
    return { limitReached: false, quoteCount: 0 }
  }

  // Free tier — count quotes in the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const quoteCount = await Quote.count({
    where: {
      userId: user.id,
      createdAt: { [Op.gte]: thirtyDaysAgo },
    },
  })

  return {
    limitReached: quoteCount >= FREE_TIER_QUOTE_LIMIT,
    quoteCount: quoteCount,
  }
}
