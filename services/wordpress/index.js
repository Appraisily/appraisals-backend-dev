const { getPost, getMedia, updatePost } = require('./client');
const { fetchPostData, getImageUrl } = require('./dataFetching');
const { updatePostACFFields, updateWordPressMetadata } = require('./updates');

// Export all functions explicitly to avoid naming conflicts
module.exports = {
  // Client methods
  getPost,
  getMedia,
  getImageUrl,
  updatePost,
  // Data fetching
  fetchPostData,
  // Updates
  updatePostACFFields,
  updateWordPressMetadata,
};