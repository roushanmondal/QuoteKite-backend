import sequelize from '../config/db.config'
import User from './user.model'
import Quote from './quote.model'
import Subscription from './subscription.model'
import CompanyProfile from './company.model'

// A User can have many quotes
User.hasMany(Quote, { foreignKey: 'userId', onDelete: 'CASCADE' })
Quote.belongsTo(User, { foreignKey: 'userId' })

User.hasMany(Subscription, { foreignKey: 'userId' })
Subscription.belongsTo(User, { foreignKey: 'userId' })

User.hasOne(CompanyProfile, { foreignKey: 'userId', as: 'companyProfile' })
CompanyProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' })

export const db = {
  sequelize,
  User,
  Quote,
  Subscription,
  CompanyProfile,
}
