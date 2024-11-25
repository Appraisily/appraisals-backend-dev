const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { AppraisalPDFGenerator } = require('../services/pdf');
const { 
  getPostMetadata, 
  getPostTitle, 
  getPostDate, 
  getImageFieldUrlFromPost, 
  getPostGallery, 
  updatePostACFFields 
} = require('../services/wordpress');

router.post('/generate-pdf', async (req, res) => {
  const { postId, session_ID } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Get metadata fields
    const metadataKeys = [
      'test', 'ad_copy', 'age_text', 'age1', 'condition',
      'signature1', 'signature2', 'style', 'valuation_method',
      'conclusion1', 'conclusion2', 'authorship', 'table',
      'glossary', 'value'
    ];

    const metadataPromises = metadataKeys.map(key => getPostMetadata(postId, key));
    const metadataValues = await Promise.all(metadataPromises);

    const metadata = {};
    metadataKeys.forEach((key, index) => {
      metadata[key] = metadataValues[index];
    });

    // Get title, date, and image URLs
    const [postTitle, postDate, ageImageUrl, signatureImageUrl, mainImageUrl, gallery] = await Promise.all([
      getPostTitle(postId),
      getPostDate(postId),
      getImageFieldUrlFromPost(postId, 'age'),
      getImageFieldUrlFromPost(postId, 'signature'),
      getImageFieldUrlFromPost(postId, 'main'),
      getPostGallery(postId)
    ]);

    // Format value if present
    let appraisalValue = '';
    if (metadata.value) {
      const numericValue = parseFloat(metadata.value);
      if (!isNaN(numericValue)) {
        appraisalValue = numericValue.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
        });
      } else {
        appraisalValue = metadata.value;
      }
    }

    // Prepare data for PDF generation
    const pdfData = {
      id: session_ID || uuidv4(),
      appraisal_title: postTitle,
      appraisal_date: postDate,
      appraisal_value: appraisalValue,
      main_image: mainImageUrl,
      age_image: ageImageUrl,
      signature_image: signatureImageUrl,
      gallery: gallery,
      ...metadata
    };

    // Generate PDF
    const pdfGenerator = new AppraisalPDFGenerator(pdfData);
    const pdfDoc = await pdfGenerator.generatePDF();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=appraisal_${postId}.pdf`);

    // Stream PDF to response
    pdfDoc.pipe(res);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating PDF'
    });
  }
});

module.exports = router;