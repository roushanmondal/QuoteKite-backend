import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/db.config'

export interface UserAttributes {
  id: number
  firstName: string | null
  lastName: string | null
  email: string
  password: string
  role: 'admin' | 'member'
  status: boolean
  isEmailVerified: boolean
  emailVerificationToken: string | null
  emailVerificationTokenExpiresAt: Date | null
  isSubscribedToMarketing: boolean
  passwordResetToken: string | null;
  passwordResetTokenExpiresAt: Date | null;
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface UserCreationAttributes
  extends Optional<
    UserAttributes,
    | 'id'
    | 'firstName'
    | 'lastName'
    | 'status'
    | 'role'
    | 'isEmailVerified'
    | 'emailVerificationToken'
    | 'emailVerificationTokenExpiresAt'
    | 'isSubscribedToMarketing'
    | 'createdAt'
    | 'updatedAt'
  > {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number
  public firstName!: string | null
  public lastName!: string | null
  public email!: string
  public password!: string
  public role!: 'admin' | 'member'
  public status!: boolean
  public isEmailVerified!: boolean
  public emailVerificationToken!: string | null
  public emailVerificationTokenExpiresAt!: Date | null
  public isSubscribedToMarketing!: boolean
  public passwordResetToken!: string | null
  public passwordResetTokenExpiresAt!: Date | null
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    firstName: { type: DataTypes.STRING, allowNull: true },
    lastName: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
    status: { type: DataTypes.BOOLEAN, defaultValue:true },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerificationTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isSubscribedToMarketing: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  { sequelize, tableName: 'Users' }
)

export default User
