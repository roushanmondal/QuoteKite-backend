import app from './app'
import { db } from './models'
// import { startQuoteCleanupJob } from './jobs/quoteCleanup'

const PORT = process.env.PORT || 65432
console.log('Attempting to connect to the database...')

db.sequelize
  .sync()
  .then(() => {
    console.log('Database synchronized successfully.')

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`)
      // startQuoteCleanupJob()
    })
  })
  .catch((err: Error) => {
    console.error('Unable to connect to the database:', err)
  })
