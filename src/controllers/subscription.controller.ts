import { Request, Response } from 'express'
import Stripe from 'stripe'
import { db } from '../models/index'
import ApiResponse from '../utils/apiResponse'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const User = db.User
const Subscription = db.Subscription

const PRICE_ID_PRO = process.env.PRICE_ID_PRO
const PRICE_ID_ENTERPRISE = process.env.PRICE_ID_ENTERPRISE

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { planType } = req.body
  const user = req.user!

  try {
    // 1. Use `findAll` to safely handle all active subscriptions.
    const activeSubscriptions = await Subscription.findAll({
      where: { userId: user.id, status: 'active' },
    })

    // 2. Add the new logic to handle downgrading to the 'free' plan.
    if (planType === 'free') {
      if (activeSubscriptions.length === 0) {
        return ApiResponse.error(res, 400, 'You do not have an active plan to cancel.')
      }
      for (const sub of activeSubscriptions) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId)
        await sub.update({ status: 'canceled', canceledAt: new Date() })
      }
      return ApiResponse.success(res, 200, { message: 'Subscription canceled successfully.' }, 'Subscription canceled successfully.')
    }

    // 3. Update existing logic to work with the `activeSubscriptions` array.
    const isAlreadyOnPlan = activeSubscriptions.some((sub) => sub.plan === planType)
    if (isAlreadyOnPlan) {
      return ApiResponse.error(res, 400, `You are already subscribed to the ${planType} plan.`)
    }

    let stripeCustomerId: string | undefined
    if (activeSubscriptions.length > 0) {
      stripeCustomerId = activeSubscriptions[0].stripeCustomerId
    }

    // This block now correctly cancels all old plans before creating a new one.
    if (activeSubscriptions.length > 0) {
      console.log(`User ${user.id} is switching plans. Canceling ${activeSubscriptions.length} old subscription(s).`)
      for (const sub of activeSubscriptions) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId)
        await sub.update({ status: 'canceled', canceledAt: new Date() })
      }
    }

    // Create a new Stripe Customer if one doesn't exist.
    if (!stripeCustomerId) {
      console.log(`Creating new Stripe customer for user ${user.id}`)
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id.toString() },
      })
      stripeCustomerId = customer.id
    }

    // Create a new checkout session for the new plan.
    const newPriceId = planType === 'pro' ? PRICE_ID_PRO : PRICE_ID_ENTERPRISE
    console.log(`Creating a new checkout session for user ${user.id} with plan ${planType}`)
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: newPriceId, quantity: 1 }],
      client_reference_id: user.id.toString(),
      success_url: `${process.env.ORIGIN}/payment/success`,
      cancel_url: `${process.env.ORIGIN}/payment/cancelled`,
      expand: ['subscription', 'invoice'],
    })

    return res.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Stripe Session Error:', error)
    return ApiResponse.error(res, 500, `Failed to create session: ${error.message}`)
  }
}

type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'
type PlanType = 'free' | 'pro' | 'enterprise'

/**
 * Maps all possible Stripe subscription statuses to the ones your database can store.
 * @param stripeStatus The status from the Stripe API.
 * @returns A status that is valid for your database model.
 */
const mapStripeStatus = (stripeStatus: Stripe.Subscription.Status): SubscriptionStatus => {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active' // Treat trialing users as active

    case 'past_due':
    case 'incomplete':
      return 'past_due'

    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'canceled'

    default:
      return 'canceled' // Default to a safe, inactive status
  }
}

/**
 * Helper function to sync Stripe subscription data with your database.
 * This function handles both creating and updating subscriptions.
 */
const syncSubscriptionWithDB = async (stripeSubscription: Stripe.Subscription, userId?: number, period?: { start: number; end: number }) => {
  const priceId = stripeSubscription.items.data[0]?.price.id
  const plan: PlanType = priceId === PRICE_ID_PRO ? 'pro' : 'enterprise'
  const stripeCustomerId = stripeSubscription.customer as string

  const subscriptionData = {
    plan,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId,
    status: mapStripeStatus(stripeSubscription.status),
    // Use dates from the invoice if provided, otherwise fall back to the subscription's dates.
    periodStartsAt: new Date((period ? period.start : (stripeSubscription as any).current_period_start) * 1000),
    periodEndsAt: new Date((period ? period.end : (stripeSubscription as any).current_period_end) * 1000),
    trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
    canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
  }

  // Find an existing subscription to update, or prepare to create a new one
  const existingSubscription = await Subscription.findOne({ where: { stripeSubscriptionId: stripeSubscription.id } })

  if (existingSubscription) {
    // If it exists, it's an update (e.g., status change from a webhook).
    await existingSubscription.update(subscriptionData)
    console.log(`Subscription ${stripeSubscription.id} updated in DB.`)
  } else if (userId) {
    // If it doesn't exist and we have a userId (from checkout), it's a new subscription. Create it.
    await Subscription.create({
      ...subscriptionData,
      userId,
    })
    console.log(`New subscription ${stripeSubscription.id} created in DB for user ${userId}.`)
  } else {
    console.error(`Webhook Error: Could not find subscription ${stripeSubscription.id} to update, and no userId was provided to create a new one.`)
  }
}

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
    console.log('Received Stripe Webhook Event:', JSON.stringify(event, null, 2))
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`)
    console.error(err)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      // Check that we have all the necessary information from the session
      if (session.subscription && session.invoice && session.client_reference_id) {
        const userId = parseInt(session.client_reference_id, 10)

        // Retrieve the full subscription and invoice objects
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const invoice = await stripe.invoices.retrieve(session.invoice as string)

        const lineItem = invoice.lines.data[0]
        if (lineItem && lineItem.period) {
          await syncSubscriptionWithDB(subscription, userId, {
            start: lineItem.period.start,
            end: lineItem.period.end,
          })
        } else {
          console.error('Invoice is missing line items or period data.')
        }
      } else {
        console.log('Checkout session completed, but missing subscription, invoice, or client_reference_id.')
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await syncSubscriptionWithDB(subscription)
      break
    }
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  res.json({ received: true })
}

export const getCurrentUserSubscription = async (req: Request, res: Response) => {
  const userId = req.user!.id
  console.log(`Fetching subscription for User ID: ${userId}`)

  try {
    const subscription = await Subscription.findOne({
      where: { userId, status: 'active' },
      order: [['createdAt', 'DESC']],
    })

    if (subscription) {
      return ApiResponse.success(res, 200, subscription, 'Subscription found.')
    } else {
      const freePlan = {
        plan: 'free',
        status: 'active',
        periodEndsAt: null,
      }
      return ApiResponse.success(res, 200, freePlan, 'User is on the default free plan.')
    }
  } catch (error) {
    console.error(`Error fetching subscription for User ID ${userId}:`, error)
    return ApiResponse.error(res, 500, 'Failed to retrieve subscription details.')
  }
}

export const getAllSubscriptions = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1
  const limit = parseInt(req.query.limit as string, 10) || 10
  const offset = (page - 1) * limit

  console.log(`Admin request to fetch all subscriptions for page ${page}.`)

  try {
    const { count, rows } = await Subscription.findAndCountAll({
      include: [
        {
          model: User,
          attributes: ['id', 'firstName', 'lastName', 'email'],
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
        subscriptions: rows,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        totalSubscriptions: count,
      },
      'All subscriptions retrieved.'
    )
  } catch (error) {
    console.error('Error fetching all subscriptions:', error)
    return ApiResponse.error(res, 500, 'Failed to retrieve subscriptions.')
  }
}
