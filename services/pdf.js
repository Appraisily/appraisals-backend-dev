const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const QRCode = require('qrcode');
const { format } = require('date-fns');
const fetch = require('node-fetch');

// PDF Generation Constants
const COLORS = {
  primaryBlue: '#007bff',
  secondaryBlue: '#0056b3',
  primaryText: '#1a1a1a',
  secondaryText: '#6B7280',
  mutedText: '#9CA3AF',
  primaryBg: '#FFFFFF',
  secondaryBg: '#F9FAFB',
  accentBg: '#EBF5FF',
  primaryBorder: '#E5E7EB',
  accentBorder: '#007bff'
};

class AppraisalPDFGenerator {
  constructor(data) {
    this.data = data;
    this.currentPage = 0;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      bufferPages: true,
      info: {
        Title: `Art Appraisal Report - ${data.appraisal_title}`,
        Author: 'Andrés Gómez',
        Subject: 'Art Appraisal Report',
        Keywords: 'art, appraisal, valuation',
        CreationDate: new Date(),
        ModDate: new Date()
      }
    });

    // Initialize page counter
    this.doc.on('pageAdded', () => {
      this.currentPage++;
      if (this.currentPage > 1) {
        this.addPageNumber();
      }
    });
  }

  async generatePDF() {
    try {
      this.setupDocument();
      await this.generateCoverPage();
      await this.generateTableOfContents();
      await this.generateContent();
      await this.addSecurityFeatures();
      this.doc.end();
      return this.doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  setupDocument() {
    this.doc.font('Helvetica');
  }

  async generateCoverPage() {
    // Add logo
    const logoResponse = await fetch('https://ik.imagekit.io/appraisily/WebPage/logo_new.png?updatedAt=1731919266638');
    const logoBuffer = await logoResponse.buffer();
    this.doc.image(logoBuffer, 72, 72, { width: 180 });

    // Add title
    this.doc.fontSize(32)
      .font('Helvetica-Bold')
      .text(this.data.appraisal_title || 'Art Appraisal Report', {
        align: 'center',
        y: 200
      });

    // Add subtitle
    this.doc.fontSize(18)
      .font('Helvetica')
      .text('Appraisal Report', {
        align: 'center',
        y: 250
      });

    // Add main image if available
    if (this.data.main_image) {
      try {
        const imageResponse = await fetch(this.data.main_image);
        const imageBuffer = await imageResponse.buffer();
        this.doc.image(imageBuffer, {
          fit: [400, 300],
          align: 'center',
          y: 300
        });
      } catch (error) {
        console.error('Error adding main image:', error);
      }
    }

    this.doc.addPage();
  }

  async generateTableOfContents() {
    this.doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('Table of Contents', 72, 72);

    const sections = [
      'Introduction',
      'Artwork Image Analysis',
      'Estimation of Artwork Age',
      'Artwork Condition Assessment',
      'Artist Profile and Artwork History',
      'Signature Analysis',
      'Artwork Analysis',
      'Valuation Methodology',
      'Conclusion',
      'Glossary of Terms'
    ];

    let y = 120;
    sections.forEach((section, index) => {
      if (y > this.doc.page.height - 100) {
        this.doc.addPage();
        y = 72;
      }

      this.doc.fontSize(12)
        .font('Helvetica')
        .text(section, 72, y)
        .text((index + 1).toString(), 500, y);
      y += 20;
    });

    this.doc.addPage();
  }

  addSection(title, content) {
    if (!content) return;

    this.doc.addPage();
    
    // Add section header
    this.doc.fontSize(24)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primaryText)
      .text(title, 72, 72);

    // Add content with proper text wrapping
    this.doc.fontSize(11)
      .font('Helvetica')
      .fillColor(COLORS.primaryText)
      .text(Array.isArray(content) ? content.join('\n\n') : content, {
        width: 468,
        align: 'justify',
        lineBreak: true
      });
  }

  async generateContent() {
    // Introduction
    this.addSection('Introduction', this.data.introduction);

    // Artwork Analysis
    this.addSection('Artwork Image Analysis', this.data.test);
    
    // Add gallery images if available
    if (this.data.gallery && Array.isArray(this.data.gallery)) {
      await this.addGalleryImages(this.data.gallery);
    }

    // Age Analysis
    this.addSection('Estimation of Artwork Age', [
      this.data.age_text,
      this.data.age1
    ].filter(Boolean));

    // Condition Assessment
    this.addSection('Artwork Condition Assessment', this.data.condition);

    // Signature Analysis
    this.addSection('Signature Analysis', [
      this.data.signature1,
      this.data.signature2
    ].filter(Boolean));

    // Style Analysis
    this.addSection('Artwork Analysis', this.data.style);

    // Valuation
    this.addSection('Valuation Methodology', this.data.valuation_method);

    // Conclusion
    this.addSection('Conclusion', [
      this.data.conclusion1,
      this.data.conclusion2
    ].filter(Boolean));

    // Value Display
    if (this.data.appraisal_value) {
      this.addValueDisplay(this.data.appraisal_value);
    }

    // Glossary
    this.addSection('Glossary of Terms', this.data.glossary);
  }

  async addGalleryImages(gallery) {
    if (!Array.isArray(gallery) || gallery.length === 0) return;

    const imagesPerRow = 3;
    const imageWidth = 140;
    const imageHeight = 140;
    const margin = 20;

    for (let i = 0; i < gallery.length; i += imagesPerRow) {
      if (i > 0) {
        this.doc.addPage();
      }

      const row = gallery.slice(i, i + imagesPerRow);
      for (let j = 0; j < row.length; j++) {
        try {
          const x = 72 + (j * (imageWidth + margin));
          const y = this.doc.y + 20;

          const imageResponse = await fetch(row[j]);
          const imageBuffer = await imageResponse.buffer();
          this.doc.image(imageBuffer, x, y, {
            fit: [imageWidth, imageHeight],
            align: 'center',
            valign: 'center'
          });
        } catch (error) {
          console.error('Error adding gallery image:', error);
        }
      }
    }
  }

  addValueDisplay(value) {
    if (!value) return;

    this.doc.addPage();
    
    const box = {
      x: 72,
      y: this.doc.y + 20,
      width: 468,
      height: 100
    };

    // Draw value box
    this.doc.save()
      .rect(box.x, box.y, box.width, box.height)
      .fill(COLORS.primaryBlue);

    // Add value text
    this.doc.fontSize(32)
      .font('Helvetica-Bold')
      .fillColor('white')
      .text('Final Appraisal Value', box.x + 20, box.y + 20)
      .fontSize(24)
      .text(value, box.x + 20, box.y + 60);

    this.doc.restore();
  }

  async addSecurityFeatures() {
    try {
      // Add watermark
      this.doc.save()
        .translate(this.doc.page.width / 2, this.doc.page.height / 2)
        .rotate(45)
        .fontSize(60)
        .fillOpacity(0.05)
        .text('APPRAISILY', -150, 0)
        .restore();

      // Add QR code
      if (this.data.id) {
        const qrData = `https://appraisily.com/verify/${this.data.id}`;
        const qrImage = await QRCode.toBuffer(qrData);
        this.doc.image(qrImage, 500, this.doc.page.height - 100, { width: 72 });
      }
    } catch (error) {
      console.error('Error adding security features:', error);
    }
  }

  addPageNumber() {
    this.doc.fontSize(8)
      .font('Helvetica')
      .text(
        `Page ${this.currentPage}`,
        0,
        this.doc.page.height - 50,
        { align: 'center' }
      );
  }
}

module.exports = {
  AppraisalPDFGenerator
};