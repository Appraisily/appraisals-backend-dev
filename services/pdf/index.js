const { google } = require('googleapis');
const config = require('../../config');
const PDFGenerator = require('./pdfGenerator');
const { Readable } = require('stream');
const { insertGalleryGrid } = require('./gallery');
const { insertImageAtPlaceholder } = require('./imageUtils');
const { 
  cloneTemplate: cloneTemplateBase, 
  moveFileToFolder, 
  replacePlaceholdersInDocument, 
  adjustTitleFontSize,
  getTemplateId: getTemplateIdBase 
} = require('./documentUtils');
const { exportToPDF, uploadPDFToDrive } = require('./exportUtils');

let docs;
let drive;

async function initializeGoogleApis() {
  try {
    const credentials = JSON.parse(config.GOOGLE_DOCS_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const authClient = await auth.getClient();
    drive = google.drive({ version: 'v3', auth: authClient });

    console.log('Google Drive client initialized successfully.');
  } catch (error) {
    console.error('Error initializing Google APIs:', error);
    throw error;
  }
}

async function generatePDF(metadata, images) {
  try {
    const pdfGenerator = new PDFGenerator();
    const doc = await pdfGenerator.generateAppraisalReport(metadata, images);
    
    return new Promise((resolve, reject) => {
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

async function uploadPDFToDrive(pdfBuffer, filename, folderId) {
  try {
    const fileMetadata = {
      name: filename,
      parents: [folderId],
      mimeType: 'application/pdf',
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(pdfBuffer),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
    });

    return file.data.webViewLink;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

async function addGalleryImages(documentId, gallery) {
  try {
    console.log('Starting gallery image insertion:', gallery.length, 'images');
    
    const document = await docs.documents.get({ documentId });
    const content = document.data.body.content;
    let galleryIndex = -1;

    // Find gallery placeholder
    const findGalleryPlaceholder = (elements) => {
      for (const element of elements) {
        if (element.paragraph?.elements) {
          for (const elem of element.paragraph.elements) {
            if (elem.textRun?.content.includes('{{gallery}}')) {
              galleryIndex = elem.startIndex;
              return true;
            }
          }
        }
      }
      return false;
    };

    findGalleryPlaceholder(content);

    if (galleryIndex === -1) {
      console.warn('Gallery placeholder not found');
      return;
    }

    // Insert gallery grid
    try {
      await insertGalleryGrid(docs, documentId, galleryIndex, gallery);
    } catch (error) {
      console.error('Error in gallery grid insertion:', error);
      // Try to add a message instead
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{
              insertText: {
                location: { index: galleryIndex },
                text: 'Similar images section could not be generated.'
              }
            }]
          }
        });
      } catch (fallbackError) {
        console.error('Error adding fallback message:', fallbackError);
      }
    }
    console.log('Gallery insertion complete');
  } catch (error) {
    console.error('Error adding gallery images:', error);
    // Don't throw the error, let the process continue
  }
}

// Wrapper functions that provide initialized clients
async function getTemplateIdWrapper(appraisalType) {
  return getTemplateIdBase(appraisalType);
}

async function cloneTemplateWrapper(templateId) {
  return cloneTemplateBase(drive, templateId);
}

function moveFileToFolderWrapper(fileId, folderId) {
  return moveFileToFolder(drive, fileId, folderId);
}

function replacePlaceholdersInDocumentWrapper(documentId, data) {
  return replacePlaceholdersInDocument(docs, documentId, data);
}

function adjustTitleFontSizeWrapper(documentId, titleText) {
  return adjustTitleFontSize(docs, documentId, titleText);
}

function insertImageAtPlaceholderWrapper(documentId, placeholder, imageUrl) {
  // Remove _image suffix if present in placeholder name
  const cleanPlaceholder = placeholder.replace(/_image$/, '');
  return insertImageAtPlaceholder(docs, documentId, cleanPlaceholder, imageUrl);
}

function exportToPDFWrapper(documentId) {
  return exportToPDF(drive, documentId);
}

module.exports = {
  initializeGoogleApis,
  generatePDF,
  uploadPDFToDrive,
  addGalleryImages,
  cloneTemplate: cloneTemplateWrapper,
  getTemplateId: getTemplateIdWrapper,
  moveFileToFolder: moveFileToFolderWrapper,
  replacePlaceholdersInDocument: replacePlaceholdersInDocumentWrapper,
  adjustTitleFontSize: adjustTitleFontSizeWrapper,
  insertImageAtPlaceholder: insertImageAtPlaceholderWrapper,
  exportToPDF: exportToPDFWrapper
};