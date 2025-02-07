const fetch = require('node-fetch');
const { generateJustificationHtml } = require('./formatters');

async function getValuationJustification(title, value) {
  try {
    console.log('[Justification] Requesting valuation justification for:', title);
    console.log('[Justification] Value:', value);

    const response = await fetch('https://valuer-agent-856401495068.us-central1.run.app/api/justify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: title,
        value: parseFloat(value)
      })
    });

    if (!response.ok) {
      throw new Error(`Justification API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Justification] Received response:', data);

    // Generate HTML representation
    const htmlContent = await generateJustificationHtml(data);
    
    return {
      raw: data,
      html: htmlContent
    };

  } catch (error) {
    console.error('[Justification] Error:', error);
    throw error;
  }
}

module.exports = {
  getValuationJustification
};