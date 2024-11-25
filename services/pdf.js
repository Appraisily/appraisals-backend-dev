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
      // Add first page
      this.doc.addPage();
      await this.generateCoverPage();

      // Generate content pages
      await this.generateContent();
      
      // Number all pages except the first
      const range = this.doc.bufferedPageRange();
      for (let i = 1; i < range.count; i++) {
        this.doc.switchToPage(i);
        this.addPageNumber(i);
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
      const pageWidth = this.doc.page.width;
      const pageHeight = this.doc.page.height;
      const margin = DESIGN.spacing.xxl;

      // Add elegant gradient background
      this.doc
        .rect(0, 0, pageWidth, pageHeight)
        .fill(`linear-gradient(180deg, ${DESIGN.colors.muted} 0%, ${DESIGN.colors.background} 100%)`);

      // Add logo
      const logoResponse = await fetch('https://ik.imagekit.io/appraisily/WebPage/logo_new.png?updatedAt=1731919266638');
      const logoBuffer = await logoResponse.buffer();
      this.doc.image(logoBuffer, margin, margin, { 
        width: 180
      });

      // Calculate text width for title wrapping
      const maxWidth = pageWidth - (margin * 2);

      // Add title with automatic text wrapping
      this.doc
        .fontSize(DESIGN.typography.title)
        .font('Helvetica-Bold')
        .fillColor(DESIGN.colors.primary);

      const titleY = margin + 120;
      const wrappedTitle = this.doc.widthOfString(this.data.appraisal_title, {width: maxWidth}) > maxWidth
        ? this.wrapText(this.data.appraisal_title, maxWidth)
        : this.data.appraisal_title;

      this.doc.text(wrappedTitle, margin, titleY, {
        width: maxWidth,
        align: 'center'
      });

      // Add decorative line
      const lineY = this.doc.y + DESIGN.spacing.xl;
      this.doc
        .moveTo(margin, lineY)
        .lineTo(pageWidth - margin, lineY)
        .lineWidth(1)
        .stroke(DESIGN.colors.accent);

      // Add main image in an elegant frame
      if (this.data.main_image) {
        const imageResponse = await fetch(this.data.main_image);
        const imageBuffer = await imageResponse.buffer();
        
        // Calculate image dimensions
        const maxImageWidth = pageWidth - (margin * 4);
        const maxImageHeight = 300;
        
        // Draw image frame
        const frameY = lineY + DESIGN.spacing.xl;
        this.doc
          .rect(margin * 2, frameY, maxImageWidth, maxImageHeight)
          .fill(DESIGN.colors.background)
          .lineWidth(1)
          .stroke(DESIGN.colors.border);
        
        // Add image with padding
        this.doc.image(imageBuffer, {
          fit: [maxImageWidth - DESIGN.spacing.lg, maxImageHeight - DESIGN.spacing.lg],
          align: 'center',
          valign: 'center',
          x: margin * 2 + (DESIGN.spacing.lg / 2),
          y: frameY + (DESIGN.spacing.lg / 2)
        });

        // Add image caption
        this.doc
          .fontSize(DESIGN.typography.caption)
          .font('Helvetica')
          .fillColor(DESIGN.colors.secondary)
          .text('Artwork under appraisal', {
            align: 'center',
            y: frameY + maxImageHeight + DESIGN.spacing.md
          });
      }

      // Add report information at bottom
      const bottomY = pageHeight - (margin * 2);
      this.doc
        .fontSize(DESIGN.typography.body)
        .font('Helvetica')
        .fillColor(DESIGN.colors.secondary)
        .text('Professional Art Appraisal Report', margin, bottomY - DESIGN.spacing.xl, {
          align: 'center'
        })
        .text(`Report Date: ${this.data.appraisal_date || new Date().toLocaleDateString()}`, {
          align: 'center'
        });

    } catch (error) {
      console.error('Error generating cover page:', error);
      throw error;
    }
  }

  // Helper function to wrap text
  wrapText(text, maxWidth) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = this.doc.widthOfString(`${currentLine} ${word}`);
      
      if (width < maxWidth) {
        currentLine += ` ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    return lines.join('\n');
  }

  // Rest of the class methods remain the same...
  generateTableOfContents() {
    // Implementation remains the same...
  }

  addSection(title, content) {
    // Implementation remains the same...
  }

  addValueDisplay() {
    // Implementation remains the same...
  }

  async addSecurityFeatures() {
    // Implementation remains the same...
  }

  addPageNumber(pageNumber) {
    // Implementation remains the same...
  }

  async generateContent() {
    // Add table of contents
    this.doc.addPage();
    this.generateTableOfContents();

    // Generate sections
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
}

module.exports = {
  AppraisalPDFGenerator
};