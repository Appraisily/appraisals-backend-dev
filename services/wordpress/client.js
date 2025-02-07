const https = require('https');
const fetch = require('node-fetch');
const config = require('../../config');

const agent = new https.Agent({
  timeout: 30000
});

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Basic ${Buffer.from(`${config.WORDPRESS_USERNAME}:${config.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
  'Accept': 'application/json'
};

const DEFAULT_OPTIONS = {
  method: 'GET',
  headers: DEFAULT_HEADERS,
  agent,
  timeout: 30000
};

async function fetchWordPress(endpoint, options = {}) {
  const url = `${config.WORDPRESS_API_URL}${endpoint}`;
  console.log(`[WordPress] Fetching: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...DEFAULT_OPTIONS,
      ...options
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WordPress API error:', {
        status: response.status,
        body: errorText
      });
      throw new Error(`WordPress API error: ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', {
      error: error.message,
      code: error.code,
      type: error.type
    });
    throw error;
  }
}

async function getPost(postId, fields = ['acf'], params = {}) {
  const queryParams = new URLSearchParams({
    _fields: fields.join(','),
    ...params
  });
  
  const response = await fetchWordPress(`/appraisals/${postId}?${queryParams}`);
  return response.json();
}

async function getMedia(mediaId, fields = ['source_url']) {
  const response = await fetchWordPress(`/media/${mediaId}?_fields=${fields.join(',')}`);
  return response.json();
}

async function updatePost(postId, data) {
  console.log(`Updating post ${postId} with data:`, JSON.stringify(data, null, 2));
  
  const response = await fetchWordPress(`/appraisals/${postId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  console.log(`Update response status: ${response.status}`);
  return response.json();
}

module.exports = {
  fetchWordPress,
  getPost,
  getMedia,
  updatePost
};