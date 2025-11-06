import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/db.config'

// Interface for model attributes
export interface CompanyProfileAttributes {
  id: number
  name: string
  address: string
  phone: string
  email: string
  website?: string | null
  logoUrl?: string | null
  termsAndConditions: string
  userId: number
  createdAt?: Date
  updatedAt?: Date
}

interface CompanyProfileCreationAttributes extends Optional<CompanyProfileAttributes, 'id' | 'website' | 'logoUrl' | 'createdAt' | 'updatedAt'> {}

class CompanyProfile extends Model<CompanyProfileAttributes, CompanyProfileCreationAttributes> implements CompanyProfileAttributes {
  public id!: number
  public name!: string
  public address!: string
  public phone!: string
  public email!: string
  public website!: string | null
  public logoUrl!: string | null
  public termsAndConditions!: string
  public userId!: number

  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

// Initialize the model
CompanyProfile.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    tableName: 'CompanyProfiles',
    timestamps: true,
  }
)

export default CompanyProfile
