const { generateContent } = require('../openai');
const { getPrompt, buildContextualPrompt } = require('../utils/promptUtils');
const { updateWordPressMetadata } = require('../wordpress');
const { getValuationJustification } = require('./justification');
const { PROMPT_PROCESSING_ORDER } = require('../constants/reportStructure');

async function processAllMetadata(postId, postTitle, { postData, images }) {
  console.log(`[Metadata] Processing all fields for post "${postTitle}"`);
  const results = [];
  const context = {};
  let justificationData = null;

  for (const field of PROMPT_PROCESSING_ORDER) {
    try {
      console.log(`[Metadata] Processing field: ${field}`);
      
      // After generating value field, get justification
      if (field === 'value' && content) {
        try {
          justificationData = await getValuationJustification(postTitle, content);
          // Store both raw data and HTML representation
          await updateWordPressMetadata(postId, 'valuation_justification', JSON.stringify(justificationData.raw));
          await updateWordPressMetadata(postId, 'justification_html', justificationData.html);
          console.log('[Metadata] Valuation justification stored');
        } catch (error) {
          console.error('[Metadata] Error getting valuation justification:', error);
        }
      }
      
      // Load prompt template
      const promptTemplate = await getPrompt(field);
      
      // Build contextual prompt
      const prompt = buildContextualPrompt(promptTemplate, {
        ...context,
        justification: justificationData
      });
      
      // Generate content
      const content = await generateContent(prompt, postTitle, images);
      
      // Update WordPress
      await updateWordPressMetadata(postId, field, content);
      
      // Store in context for next iterations
      context[field] = content;
      
      results.push({
        field,
        status: 'success'
      });
    } catch (error) {
      console.error(`[Metadata] Error processing ${field}:`, error);
      results.push({
        field,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  processAllMetadata
};