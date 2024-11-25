// config.js - Configuration management
module.exports = {
  WORDPRESS_API_URL: null,      // Set from Secret Manager
  WORDPRESS_USERNAME: null,     // Set from Secret Manager
  WORDPRESS_APP_PASSWORD: null, // Set from Secret Manager
  OPENAI_API_KEY: null,        // Set from Secret Manager
  GOOGLE_VISION_CREDENTIALS: null, // Set from Secret Manager
  GOOGLE_DOCS_CREDENTIALS: null,   // Set from Secret Manager
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || 'civil-forge-403609'
};