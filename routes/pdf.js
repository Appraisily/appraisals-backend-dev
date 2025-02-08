const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const he = require('he');
const wordpress = require('../services/wordpress');
const { processMetadata } = require('../services/pdf/metadata/processing');
const { 
  initializeGoogleApis,
  generatePDF,
  uploadPDFToDrive
} = require('../services/pdf');

router.post('/generate-pdf', async (req, res) => {
  const { postId, session_ID } = req.body;

  if (!postId) {
    return res.status(400).json({ 
      success: false, 
      message: 'postId is required.' 
    });
  }

  try {
    // Inicializar Google Drive API
    await initializeGoogleApis();

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID must be set in environment variables.');
    }

    // Obtener datos del post
    const { postData, images, title: postTitle, date: postDate } = await wordpress.fetchPostData(postId);

    // Procesar y validar metadata
    const { metadata, validation } = await processMetadata(postData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: `Missing required metadata fields: ${validation.missingFields.join(', ')}`,
        validation
      });
    }

    // Decodificar entidades HTML en el título
    const decodedTitle = he.decode(postTitle);

    // Preparar datos para el PDF
    const pdfData = {
      ...metadata,
      appraisal_title: decodedTitle,
      appraisal_date: postDate,
    };

    // Generar PDF
    const pdfBuffer = await generatePDF(pdfData, images);

    // Generar nombre de archivo
    const pdfFilename = session_ID?.trim()
      ? `${session_ID}.pdf`
      : `Appraisal_Report_Post_${postId}_${uuidv4()}.pdf`;

    // Subir PDF a Google Drive
    const pdfLink = await uploadPDFToDrive(pdfBuffer, pdfFilename, folderId);

    // Actualizar WordPress
    await wordpress.updatePostACFFields(postId, pdfLink);

    // Devolver respuesta
    res.json({
      success: true,
      message: 'PDF generated successfully.',
      pdfLink
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating PDF'
    });
  }
});

module.exports = router;