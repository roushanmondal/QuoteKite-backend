import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/db.config'

export interface SubscriptionAttributes {
  id: number
  userId: number
  plan: 'free' | 'pro' | 'enterprise'
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'
  trialEnd?: Date | null
  periodStartsAt: Date
  periodEndsAt: Date
  canceledAt?: Date | null
}

interface SubscriptionCreationAttributes extends Optional<SubscriptionAttributes, 'id'> {}

class Subscription extends Model<SubscriptionAttributes, SubscriptionCreationAttributes> implements SubscriptionAttributes {
  public id!: number
  public userId!: number
  public plan!: 'free' | 'pro' | 'enterprise'
  public stripeCustomerId!: string
  public stripeSubscriptionId!: string
  public status!: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing'
  public trialEnd?: Date | null
  public periodStartsAt!: Date
  public periodEndsAt!: Date
  public canceledAt?: Date | null
}

Subscription.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE',
    },
    plan: { type: DataTypes.ENUM('free', 'pro', 'enterprise'), allowNull: false },
    stripeCustomerId: { type: DataTypes.STRING, allowNull: false },
    stripeSubscriptionId: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('active', 'canceled', 'past_due', 'incomplete', 'trialing'), allowNull: false },
    trialEnd: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    periodStartsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    periodEndsAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    canceledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },

  { sequelize, tableName: 'Subscriptions' }
)

export default Subscription
