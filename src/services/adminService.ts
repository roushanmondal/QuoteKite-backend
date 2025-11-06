import { Op, fn, col, literal } from 'sequelize'
import { db } from '../models'

const User = db.User
const Subscription = db.Subscription
const Quote = db.Quote

const PLAN_PRICES: Record<'free' | 'pro' | 'enterprise', number> = {
  free: 0,
  pro: 30,
  enterprise: 99,
}

export async function getDashboardAnalytics() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalUsers = await User.count()
  const activeSubscriptions = await Subscription.count({ where: { status: 'active' } })

  const mrr = (await Subscription.findAll({ where: { status: 'active' } })).reduce((sum, sub) => sum + (PLAN_PRICES[sub.plan] || 0), 0)

  const quotesToday = await Quote.count({ where: { createdAt: { [Op.gte]: startOfToday } } })
  const quotesThisWeek = await Quote.count({ where: { createdAt: { [Op.gte]: startOfWeek } } })
  const quotesThisMonth = await Quote.count({ where: { createdAt: { [Op.gte]: startOfMonth } } })

  const quoteGrowthChart = await Quote.findAll({
    attributes: [
      [literal("DATE_FORMAT(`createdAt`, '%Y-%m-01')"), 'month'],
      [fn('count', col('id')), 'count'],
    ],
    where: { createdAt: { [Op.gte]: new Date(new Date().setMonth(now.getMonth() - 6)) } },
    group: ['month'],
    order: [[literal('month'), 'ASC']],
  })

  const planDistribution = await Subscription.findAll({
    attributes: ['plan', [fn('count', col('id')), 'count']],
    group: ['plan'],
  })

  const recentQuotes = await Quote.findAll({
    limit: 5,
    include: [User],
    order: [['createdAt', 'DESC']],
  })

  return {
    kpi: {
      mrr,
      totalUsers,
      activeSubscriptions,
      quotesToday,
      quotesThisWeek,
      quotesThisMonth,
    },
    charts: {
      quoteGrowth: quoteGrowthChart.map((item) => ({
        month: new Date(item.get('month') as string).toLocaleString('default', { month: 'short' }),
        'New Quotes': parseInt(item.get('count') as string, 10),
      })),
      planDistribution: planDistribution.map((item) => ({
        name: item.get('plan') as string,
        value: parseInt(item.get('count') as string, 10),
      })),
    },
    recentActivity: recentQuotes.map((q) => ({ type: 'NEW_QUOTE', data: q, date: q.createdAt })),
  }
}
