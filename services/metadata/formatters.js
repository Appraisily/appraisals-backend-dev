const { generateContent } = require('../openai');

async function generateJustificationHtml(justificationData) {
  try {
    const prompt = `
Generate simple HTML using only basic tags (p, h3, table, tr, th, td) to display the following valuation justification data. Do not include any CSS or styling. The HTML should:
1. Show the explanation in a paragraph
2. Display auction results in a basic table with columns: Title, Price, House, Date
3. Use only the most basic HTML tags
4. Avoid any styling or formatting
5. Focus on clean, semantic structure

Data to format:
${JSON.stringify(justificationData, null, 2)}

Required format:
<h3>Valuation Justification</h3>
<p>[explanation text]</p>
<h3>Auction Results</h3>
<table>
<tr><th>Title</th><th>Price</th><th>House</th><th>Date</th></tr>
[auction results rows]
</table>
`;

    const htmlContent = await generateContent(prompt);
    return htmlContent;
  } catch (error) {
    console.error('[Formatter] Error generating HTML:', error);
    // Provide fallback HTML in case of error
    return generateFallbackHtml(justificationData);
  }
}

function generateFallbackHtml(data) {
  try {
    const rows = data.auctionResults.map(result => 
      `<tr><td>${result.title}</td><td>${result.price} ${result.currency}</td><td>${result.house}</td><td>${result.date}</td></tr>`
    ).join('\n');

    return `
<h3>Valuation Justification</h3>
<p>${data.explanation}</p>
<h3>Auction Results</h3>
<table>
<tr><th>Title</th><th>Price</th><th>House</th><th>Date</th></tr>
${rows}
</table>`;
  } catch (error) {
    console.error('[Formatter] Error generating fallback HTML:', error);
    return '<p>Error displaying valuation justification.</p>';
  }
}

module.exports = {
  generateJustificationHtml
};