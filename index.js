const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initializeGoogleApis } = require('./services/pdf');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://appraisers-frontend-856401495068.us-central1.run.app',
    'https://appraisers-task-queue-856401495068.us-central1.run.app',
    'https://appraisers-backend-856401495068.us-central1.run.app'
  ],
  credentials: true
}));

// Add request logging
app.use(requestLogger);

// Initialize and start server
async function startServer() {
  try {
    // Initialize configuration
    await config.initialize();

    // Initialize Google APIs
    await initializeGoogleApis();

    // Load routers after secrets are available
    const appraisalRouter = require('./routes/appraisal');
    const pdfRouter = require('./routes/pdf');

    // Use routers
    app.use('/', appraisalRouter);
    app.use('/', pdfRouter);

    // Error handling middleware
    app.use(errorHandler);

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();