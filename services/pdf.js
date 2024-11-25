const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fetch = require('node-fetch');

// Design system constants
const DESIGN = {
  colors: {
    primary: '#18181B',      // Zinc-900 for primary text
    secondary: '#71717A',    // Zinc-500 for secondary text
    accent: '#2563EB',       // Blue-600 for accents
    muted: '#E4E4E7',       // Zinc-200 for subtle backgrounds
    background: '#FFFFFF',   // White for main background
    border: '#D4D4D8'       // Zinc-300 for borders
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  typography: {
    title: 32,
    heading1: 24,
    heading2: 20,
    heading3: 16,
    body: 11,
    caption: 9
  }
};

class AppraisalPDFGenerator {
  constructor(data) {
    this.data = data;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: DESIGN.spacing.xxl,
        bottom: DESIGN.spacing.xxl,
        left: DESIGN.spacing.xxl,
        right: DESIGN.spacing.xxl
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

  async generateCoverPage() {
    try {
      // Add elegant header with logo
      const logoResponse = await fetch('https://ik.imagekit.io/appraisily/WebPage/logo_new.png?updatedAt=1731919266638');
      const logoBuffer = await logoResponse.buffer();
      
      // Create header background
      this.doc
        .rect(0, 0, this.doc.page.width, DESIGN.spacing.xxl * 3)
        .fill(DESIGN.colors.muted);
      
      // Add logo
      this.doc.image(logoBuffer, DESIGN.spacing.xxl, DESIGN.spacing.xl, { 
        width: 150,
        align: 'left'
      });

      // Add decorative line
      this.doc
        .moveTo(DESIGN.spacing.xxl, DESIGN.spacing.xxl * 4)
        .lineTo(this.doc.page.width - DESIGN.spacing.xxl, DESIGN.spacing.xxl * 4)
        .lineWidth(0.5)
        .stroke(DESIGN.colors.accent);

      // Add title with elegant typography
      this.doc
        .fontSize(DESIGN.typography.title)
        .fillColor(DESIGN.colors.primary)
        .text(this.data.appraisal_title || 'Art Appraisal Report', {
          align: 'center',
          y: DESIGN.spacing.xxl * 5
        });

      // Add subtitle
      this.doc
        .fontSize(DESIGN.typography.heading2)
        .fillColor(DESIGN.colors.secondary)
        .text('Professional Art Appraisal Report', {
          align: 'center',
          y: DESIGN.spacing.xxl * 6
        });

      // Add main image in an elegant frame
      if (this.data.main_image) {
        const imageResponse = await fetch(this.data.main_image);
        const imageBuffer = await imageResponse.buffer();
        
        // Draw image frame
        const frameY = DESIGN.spacing.xxl * 7;
        this.doc
          .rect(DESIGN.spacing.xxl, frameY, this.doc.page.width - (DESIGN.spacing.xxl * 2), 300)
          .fill(DESIGN.colors.muted);
        
        // Add image
        this.doc.image(imageBuffer, {
          fit: [this.doc.page.width - (DESIGN.spacing.xxl * 3), 280],
          align: 'center',
          y: frameY + 10
        });
      }

      // Add date at bottom
      this.doc
        .fontSize(DESIGN.typography.body)
        .fillColor(DESIGN.colors.secondary)
        .text(`Report Date: ${this.data.appraisal_date || new Date().toLocaleDateString()}`, {
          align: 'center',
          y: this.doc.page.height - DESIGN.spacing.xxl * 3
        });

    } catch (error) {
      console.error('Error generating cover page:', error);
    }
  }

  generateTableOfContents() {
    // Add elegant section title
    this.doc
      .fontSize(DESIGN.typography.heading1)
      .fillColor(DESIGN.colors.primary)
      .text('Table of Contents', DESIGN.spacing.xxl, DESIGN.spacing.xxl);

    // Add decorative line
    this.doc
      .moveTo(DESIGN.spacing.xxl, DESIGN.spacing.xxl * 2)
      .lineTo(this.doc.page.width - DESIGN.spacing.xxl, DESIGN.spacing.xxl * 2)
      .lineWidth(0.5)
      .stroke(DESIGN.colors.accent);

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

    let y = DESIGN.spacing.xxl * 3;
    sections.forEach((section, index) => {
      // Add section with dot leaders
      this.doc
        .fontSize(DESIGN.typography.body)
        .fillColor(DESIGN.colors.primary)
        .text(section, DESIGN.spacing.xxl, y, {
          continued: true,
          width: 400
        })
        .fillColor(DESIGN.colors.secondary)
        .text('.'.repeat(50), {
          continued: true,
          align: 'right'
        })
        .fillColor(DESIGN.colors.accent)
        .text(` ${index + 1}`, {
          align: 'right'
        });

      y += DESIGN.spacing.xl;
    });
  }

  addSection(title, content) {
    if (!content) return;

    this.doc.addPage();
    
    // Add section header with accent background
    this.doc
      .rect(0, DESIGN.spacing.xl, this.doc.page.width, DESIGN.spacing.xxl * 2)
      .fill(DESIGN.colors.muted);

    // Add section title
    this.doc
      .fontSize(DESIGN.typography.heading1)
      .fillColor(DESIGN.colors.primary)
      .text(title, DESIGN.spacing.xxl, DESIGN.spacing.xxl * 1.5);

    // Add decorative line
    this.doc
      .moveTo(DESIGN.spacing.xxl, DESIGN.spacing.xxl * 3)
      .lineTo(this.doc.page.width - DESIGN.spacing.xxl, DESIGN.spacing.xxl * 3)
      .lineWidth(0.5)
      .stroke(DESIGN.colors.accent);

    // Add content with improved typography
    this.doc
      .fontSize(DESIGN.typography.body)
      .fillColor(DESIGN.colors.primary)
      .text(content, {
        width: this.doc.page.width - (DESIGN.spacing.xxl * 2),
        align: 'justify',
        columns: 1,
        columnGap: DESIGN.spacing.xl,
        height: this.doc.page.height - (DESIGN.spacing.xxl * 5),
        continued: false
      });
  }

  addValueDisplay() {
    this.doc.addPage();
    
    const box = {
      x: DESIGN.spacing.xxl,
      y: this.doc.y + DESIGN.spacing.xl,
      width: this.doc.page.width - (DESIGN.spacing.xxl * 2),
      height: DESIGN.spacing.xxl * 5
    };

    // Create elegant value display box
    this.doc
      .rect(box.x, box.y, box.width, box.height)
      .fill(DESIGN.colors.muted);

    // Add inner border
    this.doc
      .rect(box.x + DESIGN.spacing.md, box.y + DESIGN.spacing.md, 
            box.width - (DESIGN.spacing.md * 2), box.height - (DESIGN.spacing.md * 2))
      .lineWidth(1)
      .stroke(DESIGN.colors.accent);

    // Add value information
    this.doc
      .fontSize(DESIGN.typography.heading2)
      .fillColor(DESIGN.colors.primary)
      .text('Final Appraisal Value', {
        align: 'center',
        y: box.y + DESIGN.spacing.xl
      });

    this.doc
      .fontSize(DESIGN.typography.title)
      .fillColor(DESIGN.colors.accent)
      .text(this.data.appraisal_value, {
        align: 'center',
        y: box.y + DESIGN.spacing.xxl * 2
      });
  }

  async addSecurityFeatures() {
    try {
      // Add subtle watermark
      this.doc
        .save()
        .translate(this.doc.page.width / 2, this.doc.page.height / 2)
        .rotate(45)
        .fontSize(DESIGN.typography.title * 2)
        .fillColor(DESIGN.colors.muted)
        .fillOpacity(0.03)
        .text('APPRAISILY', -200, 0, {
          align: 'center'
        })
        .restore();

      // Add QR code on last page only
      if (this.data.id && this.doc.bufferedPageRange().count - 1 === this.doc._pageNumber) {
        const qrData = `https://appraisily.com/verify/${this.data.id}`;
        const qrImage = await QRCode.toBuffer(qrData, {
          color: {
            dark: DESIGN.colors.primary,
            light: DESIGN.colors.background
          }
        });
        
        // Add QR code with label
        this.doc
          .fontSize(DESIGN.typography.caption)
          .fillColor(DESIGN.colors.secondary)
          .text('Scan to verify authenticity', 
                this.doc.page.width - DESIGN.spacing.xxl * 4,
                this.doc.page.height - DESIGN.spacing.xxl * 3,
                { align: 'center', width: 100 });

        this.doc.image(qrImage, 
                      this.doc.page.width - DESIGN.spacing.xxl * 4,
                      this.doc.page.height - DESIGN.spacing.xxl * 2,
                      { width: 100 });
      }
    } catch (error) {
      console.error('Error adding security features:', error);
    }
  }

  addPageNumber(pageNumber) {
    // Add elegant page number with decorative elements
    const y = this.doc.page.height - DESIGN.spacing.xl;
    
    // Add decorative line
    this.doc
      .moveTo(DESIGN.spacing.xxl, y)
      .lineTo(this.doc.page.width - DESIGN.spacing.xxl, y)
      .lineWidth(0.5)
      .stroke(DESIGN.colors.muted);

    // Add page number
    this.doc
      .fontSize(DESIGN.typography.caption)
      .fillColor(DESIGN.colors.secondary)
      .text(
        `Page ${pageNumber}`,
        0,
        y + DESIGN.spacing.xs,
        { align: 'center' }
      );
  }
}

module.exports = {
  AppraisalPDFGenerator
};