const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

class Config {
  constructor() {
    this.secretClient = new SecretManagerServiceClient();
    this.secrets = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const secrets = [
        'WORDPRESS_API_URL',
        'wp_username',
        'wp_app_password',
        'OPENAI_API_KEY',
        'GOOGLE_VISION_CREDENTIALS',
        'GOOGLE_DOCS_CREDENTIALS'
      ];

      for (const secretName of secrets) {
        this.secrets[secretName] = await this.getSecret(secretName);
      }

      this.initialized = true;
      console.log('Configuration initialized successfully');
    } catch (error) {
      console.error('Error initializing configuration:', error);
      throw error;
    }
  }

  async getSecret(secretName) {
    try {
      const projectId = 'civil-forge-403609';
      const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.secretClient.accessSecretVersion({ name: secretPath });
      return version.payload.data.toString('utf8');
    } catch (error) {
      console.error(`Error getting secret '${secretName}':`, error);
      throw error;
    }
  }

  get WORDPRESS_API_URL() {
    return this.getConfigValue('WORDPRESS_API_URL');
  }

  get WORDPRESS_USERNAME() {
    return this.getConfigValue('wp_username');
  }

  get WORDPRESS_APP_PASSWORD() {
    return this.getConfigValue('wp_app_password');
  }

  get OPENAI_API_KEY() {
    return this.getConfigValue('OPENAI_API_KEY');
  }

  get GOOGLE_VISION_CREDENTIALS() {
    return this.getConfigValue('GOOGLE_VISION_CREDENTIALS');
  }

  get GOOGLE_DOCS_CREDENTIALS() {
    return this.getConfigValue('GOOGLE_DOCS_CREDENTIALS');
  }

  getConfigValue(key) {
    if (!this.initialized) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    if (!(key in this.secrets)) {
      throw new Error(`Configuration value '${key}' not found`);
    }
    return this.secrets[key];
  }
}

module.exports = new Config();