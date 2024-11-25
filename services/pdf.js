const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fetch = require('node-fetch');

const COLORS = {
  primaryBlue: '#007bff',
  primaryText: '#1a1a1a'
};

class AppraisalPDFGenerator {
  constructor(data) {
    this.data = data;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72
      },
      bufferPages: true,
      autoFirstPage: false,
      info: {
        Title: `Art Appraisal Report - ${data.appraisal_title}`,
        Author: 'Andrés Gómez',
        Subject: 'Art Appraisal Report',
        Keywords: 'art, appraisal, valuation'
      }
    });
    
    this.pageCount = 0;
  }

  async generatePDF() {
    try {
      // Generate all pages first
      await this.generateContent();
      
      // Number all pages except the first
      const range = this.doc.bufferedPageRange();
      for (let i = 1; i < range.count; i++) {
        this.doc.switchToPage(i);
        this.addPageNumber(i + 1);
      }

      // Add security features to all pages
      for (let i = 0; i < range.count; i++) {
        this.doc.switchToPage(i);
        await this.addSecurityFeatures();
      }

      this.doc.end();
      return this.doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  async generateContent() {
    // Cover page
    this.doc.addPage();
    await this.generateCoverPage();

    // Table of contents
    this.doc.addPage();
    this.generateTableOfContents();

    // Content sections
    if (this.data.test) {
      this.addSection('Artwork Analysis', this.data.test);
    }

    if (this.data.age_text || this.data.age1) {
      this.addSection('Age Analysis', [this.data.age_text, this.data.age1].filter(Boolean).join('\n\n'));
    }

    if (this.data.condition) {
      this.addSection('Condition Assessment', this.data.condition);
    }

    if (this.data.signature1 || this.data.signature2) {
      this.addSection('Signature Analysis', [this.data.signature1, this.data.signature2].filter(Boolean).join('\n\n'));
    }

    if (this.data.style) {
      this.addSection('Style Analysis', this.data.style);
    }

    if (this.data.valuation_method) {
      this.addSection('Valuation Methodology', this.data.valuation_method);
    }

    if (this.data.conclusion1 || this.data.conclusion2) {
      this.addSection('Conclusion', [this.data.conclusion1, this.data.conclusion2].filter(Boolean).join('\n\n'));
    }

    if (this.data.appraisal_value) {
      this.addValueDisplay();
    }

    if (this.data.glossary) {
      this.addSection('Glossary', this.data.glossary);
    }
  }

  async generateCoverPage() {
    try {
      // Add logo
      const logoResponse = await fetch('https://ik.imagekit.io/appraisily/WebPage/logo_new.png?updatedAt=1731919266638');
      const logoBuffer = await logoResponse.buffer();
      this.doc.image(logoBuffer, 72, 72, { width: 180 });

      // Add title
      this.doc
        .fontSize(32)
        .text(this.data.appraisal_title || 'Art Appraisal Report', {
          align: 'center',
          y: 200
        });

      // Add subtitle
      this.doc
        .fontSize(18)
        .text('Appraisal Report', {
          align: 'center',
          y: 250
        });

      // Add main image if available
      if (this.data.main_image) {
        const imageResponse = await fetch(this.data.main_image);
        const imageBuffer = await imageResponse.buffer();
        this.doc.image(imageBuffer, {
          fit: [400, 300],
          align: 'center',
          y: 300
        });
      }
    } catch (error) {
      console.error('Error generating cover page:', error);
    }
  }

  generateTableOfContents() {
    this.doc
      .fontSize(24)
      .text('Table of Contents', 72, 72);

    const sections = [
      'Artwork Analysis',
      'Age Analysis',
      'Condition Assessment',
      'Signature Analysis',
      'Style Analysis',
      'Valuation Methodology',
      'Conclusion',
      'Glossary'
    ];

    let y = 120;
    sections.forEach((section, index) => {
      this.doc
        .fontSize(12)
        .text(section, 72, y)
        .text((index + 1).toString(), 500, y);
      y += 20;
    });
  }

  addSection(title, content) {
    if (!content) return;

    this.doc.addPage();
    
    this.doc
      .fontSize(24)
      .text(title, 72, 72);

    this.doc
      .fontSize(11)
      .text(content, {
        width: 468,
        align: 'justify',
        continued: false
      });
  }

  addValueDisplay() {
    this.doc.addPage();
    
    const box = {
      x: 72,
      y: this.doc.y + 20,
      width: 468,
      height: 100
    };

    this.doc
      .rect(box.x, box.y, box.width, box.height)
      .fill(COLORS.primaryBlue);

    this.doc
      .fillColor('white')
      .fontSize(32)
      .text('Final Appraisal Value', box.x + 20, box.y + 20)
      .fontSize(24)
      .text(this.data.appraisal_value, box.x + 20, box.y + 60);
  }

  async addSecurityFeatures() {
    try {
      // Add watermark
      this.doc
        .save()
        .translate(this.doc.page.width / 2, this.doc.page.height / 2)
        .rotate(45)
        .fontSize(60)
        .fillOpacity(0.05)
        .text('APPRAISILY', -150, 0)
        .restore();

      // Add QR code on last page only
      if (this.data.id && this.doc.bufferedPageRange().count - 1 === this.doc._pageNumber) {
        const qrData = `https://appraisily.com/verify/${this.data.id}`;
        const qrImage = await QRCode.toBuffer(qrData);
        this.doc.image(qrImage, 500, this.doc.page.height - 100, { width: 72 });
      }
    } catch (error) {
      console.error('Error adding security features:', error);
    }
  }

  addPageNumber(pageNumber) {
    this.doc
      .fontSize(8)
      .text(
        `Page ${pageNumber}`,
        0,
        this.doc.page.height - 50,
        { align: 'center' }
      );
  }
}

module.exports = {
  AppraisalPDFGenerator
};