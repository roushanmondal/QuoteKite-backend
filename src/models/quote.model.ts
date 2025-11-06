import { DataTypes, Model, Optional } from 'sequelize'
import sequelize from '../config/db.config'

export interface QuoteAttributes {
  id: number
  quoteTitle: string
  jobDescription: string
  generatedQuote: string
  imageUrl?: string
  pdfUrl?: string
  userId: number
  createdAt?: Date
  updatedAt?: Date
}

interface QuoteCreationAttributes extends Optional<QuoteAttributes, 'id' | 'imageUrl'> {}

class Quote extends Model<QuoteAttributes, QuoteCreationAttributes> implements QuoteAttributes {
  public id!: number
  public quoteTitle!: string
  public jobDescription!: string
  public generatedQuote!: string
  public imageUrl?: string
  public pdfUrl?: string
  public userId!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Quote.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    quoteTitle: { type: DataTypes.STRING, allowNull: false },
    jobDescription: { type: DataTypes.TEXT, allowNull: false },
    generatedQuote: { type: DataTypes.TEXT('long'), allowNull: false },
    imageUrl: { type: DataTypes.STRING, allowNull: true },
    pdfUrl: { type: DataTypes.STRING, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Users', key: 'id' }, onDelete: 'CASCADE' },
  },
  {
    sequelize,
    tableName: 'Quotes',
    timestamps: true,
  }
)

export default Quote
