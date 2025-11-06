import { db } from './src/models'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const seedAdmin = async () => {
  try {
    console.log('Connecting to database...')
    await db.sequelize.authenticate()
    console.log('Database connected.')

    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      console.log('ADMIN_EMAIL and ADMIN_PASSWORD must be in the .env file')
      return
    }

    const existingAdmin = await db.User.findOne({
      where: { email: adminEmail },
    })

    if (existingAdmin) {
      console.log('Admin user already exists. Seeding not required.')
      return
    }

    console.log('Hashing admin password...')
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    console.log('Creating admin user...')
    await db.User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
    })

    console.log('Admin user seeded successfully!')
  } catch (error) {
    console.error('Error seeding admin user:', error)
  } finally {
    console.log('Closing database connection...')
    await db.sequelize.close()
  }
}

seedAdmin()
