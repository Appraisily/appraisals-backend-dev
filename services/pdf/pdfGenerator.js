const PDFDocument = require('pdfkit');
const PDFTable = require('pdfkit-table');
const fetch = require('node-fetch');
const { calculateImageDimensions } = require('./gallery');

// Cache para imágenes frecuentemente usadas
const imageCache = new Map();

class PDFGenerator {
  constructor() {
    // Configuración de PDF con límites de memoria
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true, // Importante para manejar documentos grandes
      compress: true,    // Comprimir el PDF para reducir tamaño
      info: {
        Title: 'Art Appraisal Report',
        Author: 'Andrés Gómez',
        Creator: 'Appraisily PDF Generator',
        Producer: 'PDFKit'
      }
    });

    // Colores corporativos
    this.colors = {
      primary: '#2C3E50',    // Azul oscuro
      secondary: '#34495E',  // Azul grisáceo
      accent: '#3498DB',     // Azul claro
      text: '#2C3E50',       // Color texto principal
      light: '#ECF0F1'      // Gris muy claro para fondos
    };

    // Configuración de fuentes y estilos
    this.styles = {
      header: {
        fontSize: 24,
        color: this.colors.primary
      },
      section: {
        fontSize: 16,
        color: this.colors.secondary
      },
      subsection: {
        fontSize: 14,
        color: this.colors.secondary
      },
      body: {
        fontSize: 12,
        color: this.colors.text
      }
    };

    // Configurar límites de memoria
    this.doc.on('pageAdded', () => {
      if (this.doc.pages.length > 100) {
        throw new Error('Document exceeded maximum page limit');
      }
    });
  }

  // Función auxiliar para manejar timeouts en fetch
  async fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        timeout: timeout
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Función auxiliar para cargar y cachear imágenes
  async loadImage(url) {
    if (imageCache.has(url)) {
      return imageCache.get(url);
    }

    try {
      const response = await this.fetchWithTimeout(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      
      const buffer = await response.buffer();
      
      // Solo cachear imágenes pequeñas (menos de 1MB)
      if (buffer.length < 1024 * 1024) {
        imageCache.set(url, buffer);
      }
      
      return buffer;
    } catch (error) {
      console.error(`Error loading image from ${url}:`, error);
      throw error;
    }
  }

  // Función para limpiar el caché si es necesario
  static clearImageCache() {
    imageCache.clear();
  }

  async generateAppraisalReport(metadata, images) {
    try {
      const startTime = Date.now();
      
      // Configuración inicial
      this.doc.font('Helvetica');
      
      // Generar el contenido con manejo de errores
      await this.generateContent(metadata, images);
      
      // Verificar tiempo de generación
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration > 25000) { // Si toma más de 25 segundos
        console.warn(`PDF generation took ${duration}ms, approaching timeout limit`);
      }
      
      return this.doc;
    } catch (error) {
      console.error('Error in PDF generation:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  async generateContent(metadata, images) {
    try {
      // Agregar logo y encabezado
      await this.addHeader();
      
      // Título principal
      this.addTitle(metadata.appraisal_title);
      this.addDecorationLine();
      
      // Línea decorativa
      this.addText('Made by Andrés Gómez', { 
        align: 'center',
        color: this.colors.secondary,
        fontSize: 14
      });
      
      // Tabla de contenidos con diseño mejorado
      this.addTableOfContents();
      
      // Resto del contenido con el nuevo diseño
      await this.addReportContent(metadata, images);
      
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  async addHeader() {
    try {
      const logoUrl = 'https://ik.imagekit.io/appraisily/WebPage/logo_new.png?updatedAt=1731919266638';
      const imageBuffer = await this.loadImage(logoUrl);
      const dimensions = await calculateImageDimensions(logoUrl, 150, 100);
      
      const pageWidth = this.doc.page.width - 2 * this.doc.page.margins.left;
      const x = this.doc.page.margins.left + (pageWidth - dimensions.width) / 2;
      
      this.doc.image(imageBuffer, x, this.doc.page.margins.top, {
        width: dimensions.width,
        height: dimensions.height
      });
      
      this.doc.moveDown(3);
    } catch (error) {
      console.error('Error adding header:', error);
      // Continuar sin el logo
      this.doc.moveDown(1);
    }
  }

  addDecorationLine() {
    const pageWidth = this.doc.page.width - 2 * this.doc.page.margins.left;
    const y = this.doc.y;
    
    this.doc
      .moveTo(this.doc.page.margins.left, y)
      .lineTo(this.doc.page.margins.left + pageWidth, y)
      .lineWidth(1)
      .stroke(this.colors.accent)
      .moveDown(1);
  }

  async addReportContent(metadata, images) {
    // Introducción
    this.addSection('Introduction', metadata.Introduction);
    this.addText(`Effective Day of Valuation:\n${metadata.appraisal_date}`, {
      color: this.colors.secondary,
      fontSize: 13
    });
    
    this.addDecorationLine();
    
    // Análisis de imagen
    this.addSection('Artwork Image Analysis', '');
    this.addSubsection('Introduction to Image Analysis', 
      'For this appraisal, we have employed Google Vision to conduct a comparative image analysis. The process began with submitting the artwork's primary frontal image—the most detailed and comprehensive view—to Google Vision's database. This initial image serves as the foundation for the subsequent analysis.\n\n' +
      'The objective of this image analysis is twofold. First, we aim to identify artworks that bear a visual resemblance to the piece under appraisal. By pinpointing similar works, we can gain valuable insights into the style, period, and potential influences present in the artwork being evaluated.\n\n' +
      'Second, this process assists in assessing the artwork's uniqueness and its positioning within the art market. Similarities to recognized pieces can indicate the artwork's alignment with specific artistic movements or periods, while distinctive features may highlight its individuality and potential rarity.'
    );
    
    // Galería de imágenes similares
    this.addSubsection('Visual Comparisons: Similar Artworks Identified by Google Vision', '');
    if (images.gallery && images.gallery.length > 0) {
      await this.addGalleryGrid(images.gallery);
    }
    
    // Determinación del tipo de arte
    this.addSubsection('Artwork Type Determination: AI Insights and Appraiser Expertise', metadata.test);
    
    // Estimación de edad
    this.addSection('Estimation of Artwork Age', '');
    this.addSubsection('Methodology for Determining the Age of the Artwork', metadata.age_text);
    this.addSubsection('Findings: Material Analysis, Stylistic Analysis, and Signature and Labels', metadata.age1);
    if (images.age) {
      await this.addImage(images.age, 300, 200);
    }
    
    // Evaluación de condición
    this.addSection('Artwork Condition Assessment', metadata.condition);
    
    // Perfil del artista e historia
    this.addSection('Artist Profile and Artwork History', '');
    
    // Análisis de firma
    this.addSection('Signature Analysis', 
      'This section presents a comprehensive profile of the artist, including a biographical overview that highlights key milestones and stylistic evolutions throughout their career. Following this, we examine the artwork's provenance, tracing its ownership history to verify its authenticity and enhance its estimated value. The exhibition history further enriches the narrative by documenting the piece's critical reception and its standing within the art community. By integrating biographical details, provenance, and exhibition records, we obtain a nuanced understanding of the artwork's position within the artist's oeuvre and its significance in the art market.\n\n' +
      'Additionally, this analysis includes a detailed examination of the artist's signature, as captured in the enclosed image, which is interpreted as follows:\n\n' +
      'In this phase, I analyze the signature to identify the artist. This process involves cross-referencing the signature with a meticulously curated database of notable artists, encompassing their names, backgrounds, and key biographical information. This database is an essential tool for accurately establishing the artist's identity with precision and reliability.'
    );
    
    this.addText(metadata.signature2);
    
    if (images.signature) {
      await this.addImage(images.signature, 200, 150);
    }
    
    this.addText(metadata.signature1);
    
    // Análisis de estilo
    this.addSection('Artwork Analysis: Style, Theme, and Artistic Context', metadata.style);
    
    // Metodología de valuación
    this.addSection('Valuation Methodology: Assessing the Artwork's Worth', metadata.valuation_method);
    
    // Conclusión
    this.addSection('Conclusion', metadata.conclusion1);
    this.addText(metadata.conclusion2);
    
    // Valor final
    this.addSection('Final Appraisal Value ($)', metadata.appraisal_value);
    
    // Información del tasador
    this.addSection('Appraisal Report Conducted by:', '');
    
    try {
      // Agregar imagen del tasador
      const appraiserImageUrl = 'https://ik.imagekit.io/appraisily/Appraisers/andres.png?updatedAt=1730554573181';
      const response = await fetch(appraiserImageUrl);
      if (response.ok) {
        const imageBuffer = await response.buffer();
        const dimensions = await calculateImageDimensions(appraiserImageUrl, 150, 150);
        
        // Crear un contenedor con borde para la imagen
        const containerY = this.doc.y;
        const containerWidth = 170;
        const containerHeight = dimensions.height + 20;
        
        // Centrar el contenedor
        const pageWidth = this.doc.page.width - 2 * this.doc.page.margins.left;
        const containerX = this.doc.page.margins.left + (pageWidth - containerWidth) / 2;
        
        // Dibujar el contenedor con borde redondeado
        this.doc
          .roundedRect(containerX, containerY, containerWidth, containerHeight, 5)
          .lineWidth(0.5)
          .stroke(this.colors.accent);
        
        // Agregar la imagen centrada en el contenedor
        this.doc.image(imageBuffer, containerX + 10, containerY + 10, {
          width: dimensions.width,
          height: dimensions.height,
          align: 'center'
        });
        
        this.doc.moveDown(containerHeight / 20 + 4);
      }
    } catch (error) {
      console.error('Error adding appraiser image:', error);
      // Continuar sin la imagen si hay error
      this.doc.moveDown(2);
    }

    // Información del tasador en texto
    this.addText('Andrés Gómez', { 
      align: 'center',
      color: this.colors.primary,
      fontSize: 16
    });
    
    this.addText('BSc, MSc, Accredited Art Appraiser\n' +
      'Over a Decade of Expertise in Online Art Appraisals\n' +
      'Served Over 100,000 Clients\n' +
      'Proprietor of Renowned Antique Establishment', {
      align: 'center',
      color: this.colors.secondary,
      fontSize: 12
    });
    
    this.addText('Explore my extensive portfolio of past appraisals here:\n' +
      'https://www.appraisily.com/andres-portofolio/', {
      align: 'center',
      color: this.colors.accent,
      fontSize: 12
    });
    
    this.addDecorationLine();
    
    // Resumen
    this.addSection('This Appraisal in a Nutshell', '');
    await this.addSpecificationsTable(metadata.table);
    
    // Imágenes proporcionadas
    this.addSection('Client-Provided Imagery for Appraisal Analysis', '');
    if (images.main) {
      await this.addImage(images.main, 400, 300);
    }
    if (images.age) {
      await this.addImage(images.age, 300, 200);
    }
    if (images.signature) {
      await this.addImage(images.signature, 200, 150);
    }
    
    // Proceso de tasación
    this.addSection('Appraisal Process and Appraiser Qualification Summary',
      'The mark-to-market art appraisal is a fundamental methodology for determining an artwork's current market value. This approach necessitates a comprehensive evaluation of various factors, including prevailing market trends, the artwork's condition and age, and the artist's standing within the art community. By synthesizing these elements, a mark-to-market appraisal delivers an accurate and up-to-date estimate of the artwork's value.\n\n' +
      'A pivotal aspect of this process is assessing the artist's reputation, which is evaluated through their exhibition history, accolades, and other significant achievements. This information is instrumental in forecasting the artwork's potential value trajectory. Furthermore, a meticulous assessment of the artwork's condition is crucial, as any signs of wear or damage can significantly influence its resale value.\n\n' +
      'Mark-to-market appraisals involve analyzing current art market dynamics and recent sales of comparable artworks, thereby providing a contemporary and relevant valuation. This comprehensive approach ensures equitable pricing in art transactions by accurately reflecting the current market landscape.\n\n' +
      'For insurance replacement appraisals, the mark-to-market method precisely estimates replacement costs for lost or damaged artworks, thereby guiding insurance reimbursements. This ensures fair compensation for policyholders while preventing overpayment in insurance claims.\n\n' +
      'The appraisal process encompasses an exhaustive analysis of the artwork's condition, rarity, demand, and market prices. Providing detailed photographs and descriptions assists the appraiser in identifying any factors that could affect the valuation. This thorough information facilitates a swift, efficient, and precise appraisal process, ensuring that the valuation is both accurate and reliable.'
    );
    
    // Declaración de responsabilidad
    this.addSection('A statement of the appraiser's liability and any potential conflicts of interest.',
      'Our art appraisals are conducted by seasoned professionals with specialized knowledge and extensive experience in art valuation. Our team meets stringent educational and professional standards, ensuring expertise in art research, evaluation, and current market trends. We aim to provide objective value estimates for art pieces, serving purposes such as insurance, tax assessments, estate planning, and sales.\n\n' +
      'We are committed to fairness and impartiality in all our appraisals. To maintain our objectivity, we charge a flat fee rather than a percentage of the artwork's value, thereby avoiding any potential conflicts of interest. Our appraisal reports adhere to the Uniform Standards of Professional Appraisal Practice (USPAP) established by the Appraisal Foundation, ensuring that our appraisals are ethical, of the highest quality, and legally defensible.'
    );
    
    // Cómo vender
    this.addSection('How to sell this artwork.',
      'To assist you in selling your artwork, we provide a comprehensive guide available here. This guide offers structured steps and best practices for successfully navigating the art market.\n\n' +
      'This customized ad copy is designed to highlight the unique features and value of your artwork, aiming to attract potential buyers and facilitate a successful sale.\n\n' +
      metadata.ad_copy
    );
    
    // Glosario
    this.addSection('Glossary of Terms', metadata.glossary);
    
    // Información de contacto
    this.addSection('Contacts',
      'Address\n' +
      'W1 13DD, 80 Kensington Square, office 402\n\n' +
      'Mobile\n' +
      '+44 6589 456 77\n' +
      '+44 5697 855 79\n\n' +
      'Media\n' +
      'email@company.com\n' +
      'www.company.com\n' +
      '@companytwitter'
    );
  }

  addTitle(title) {
    this.doc
      .fontSize(this.styles.header.fontSize)
      .font('Helvetica-Bold')
      .fillColor(this.styles.header.color)
      .text(title, {
        align: 'center'
      })
      .moveDown(2);
  }

  addSection(title, content) {
    if (title) {
      this.doc
        .fontSize(this.styles.section.fontSize)
        .font('Helvetica-Bold')
        .fillColor(this.styles.section.color)
        .text(title)
        .moveDown(0.5);
    }
    
    if (content) {
      this.addText(content);
    }
  }

  addSubsection(title, content) {
    if (title) {
      this.doc
        .fontSize(this.styles.subsection.fontSize)
        .font('Helvetica-Bold')
        .fillColor(this.styles.subsection.color)
        .text(title)
        .moveDown(0.5);
    }
    
    if (content) {
      this.addText(content);
    }
  }

  addText(content, options = {}) {
    if (content) {
      this.doc
        .fontSize(options.fontSize || this.styles.body.fontSize)
        .font('Helvetica')
        .fillColor(options.color || this.styles.body.color)
        .text(content, {
          align: 'justify',
          ...options
        })
        .moveDown(1);
    }
  }

  async addImage(url, maxWidth, maxHeight, caption) {
    try {
      const imageBuffer = await this.loadImage(url);
      const dimensions = await calculateImageDimensions(url, maxWidth, maxHeight);
      
      // Verificar límites razonables
      if (dimensions.width > 2000 || dimensions.height > 2000) {
        throw new Error('Image dimensions exceed reasonable limits');
      }
      
      this.doc.image(imageBuffer, {
        width: dimensions.width,
        height: dimensions.height,
        align: 'center'
      });
      
      if (caption) {
        this.doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text(caption, {
            align: 'center'
          })
          .moveDown(1);
      }
    } catch (error) {
      console.error(`Error adding image: ${error.message}`);
      // Fallar silenciosamente y mostrar placeholder
      this.doc
        .fontSize(10)
        .font('Helvetica-Oblique')
        .text('[Image not available]', {
          align: 'center'
        })
        .moveDown(1);
    }
  }

  async addSpecificationsTable(tableData) {
    if (!tableData) return;
    
    const table = {
      title: "Artwork Specifications",
      headers: ["Specification", "Detail"],
      rows: Object.entries(tableData)
    };
    
    // Estilos modernos para la tabla
    const tableStyles = {
      width: 500,
      padding: 8,
      borderWidth: 0.5,
      borderColor: this.colors.accent,
      headerBackground: this.colors.primary,
      headerColor: '#ffffff',
      rowBackground: (rowIndex) => rowIndex % 2 === 0 ? this.colors.light : '#ffffff',
      cellsPadding: 10,
      marginLeft: 40,
      marginRight: 40
    };
    
    await this.doc.table(table, {
      prepareHeader: () => this.doc.font('Helvetica-Bold').fontSize(12),
      prepareRow: () => this.doc.font('Helvetica').fontSize(12),
      ...tableStyles
    });
    
    this.doc.moveDown(1);
  }

  async addGalleryGrid(gallery) {
    const imagesPerRow = 2;
    const imageWidth = 250;
    const imageHeight = 200;
    const padding = 20;
    
    for (let i = 0; i < gallery.length; i += imagesPerRow) {
      const row = gallery.slice(i, i + imagesPerRow);
      
      // Agregar un contenedor con borde para las imágenes
      const containerY = this.doc.y;
      const containerHeight = imageHeight + 2 * padding;
      const containerWidth = this.doc.page.width - 2 * this.doc.page.margins.left;
      
      // Dibujar el contenedor
      this.doc
        .rect(
          this.doc.page.margins.left,
          containerY,
          containerWidth,
          containerHeight
        )
        .lineWidth(0.5)
        .stroke(this.colors.accent);
      
      // Agregar las imágenes dentro del contenedor
      for (const [index, imageUrl] of row.entries()) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) continue;
          
          const imageBuffer = await response.buffer();
          const x = index * (imageWidth + padding) + this.doc.page.margins.left + padding;
          
          this.doc.image(imageBuffer, x, containerY + padding, {
            width: imageWidth,
            height: imageHeight - 2 * padding,
            align: 'center'
          });
        } catch (error) {
          console.error(`Error adding gallery image: ${error.message}`);
        }
      }
      
      this.doc.moveDown(containerHeight / 20 + 2);
    }
  }

  addTableOfContents() {
    this.addSection('Table of Contents', '');
    
    const contents = [
      'Introduction', 'Artwork Image Analysis', 'Introduction to Image Analysis',
      'Visual Comparisons: Similar Artworks Identified by Google Vision',
      'Artwork Type Determination: AI Insights and Appraiser Expertise',
      'Estimation of Artwork Age', 'Methodology for Determining the Age of the Artwork',
      'Findings: Material Analysis, Stylistic Analysis, and Signature and Labels',
      'Artwork Condition Assessment', 'Artist Profile and Artwork History',
      'Signature Analysis', 'Artwork Analysis: Style, Theme, and Artistic Context',
      'Comparative Analysis', 'Insurance Recommendations',
      'Future Conservation Recommendations', 'Historical Context',
      'Authorship type', 'Valuation Methodology: Assessing the Artwork's Worth',
      'Conclusion', 'Final Appraisal Value ($)', 'This Appraisal in a Nutshell',
      'Client-Provided Imagery for Appraisal Analysis',
      'Appraisal Process and Appraiser Qualification Summary',
      'A statement of the appraiser's liability and any potential conflicts of interest.',
      'How to sell this artwork.', 'Glossary of Terms'
    ];

    // Agregar línea decorativa antes del índice
    this.addDecorationLine();

    contents.forEach((item, index) => {
      // Alternar colores para mejor legibilidad
      const color = index % 2 === 0 ? this.colors.primary : this.colors.secondary;
      
      this.doc
        .fontSize(11)
        .fillColor(color)
        .text(item, {
          continued: true,
          align: 'left'
        })
        .fillColor(this.colors.accent)
        .text(`  ${index + 3}`, {
          align: 'right'
        });
    });
    
    // Agregar línea decorativa después del índice
    this.addDecorationLine();
    this.doc.moveDown(2);
  }
}

module.exports = PDFGenerator; 