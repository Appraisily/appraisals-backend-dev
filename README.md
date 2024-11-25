# Appraisals Backend Service

Backend service for automating art appraisal reports using Google Vision AI, OpenAI GPT-4 Vision, and PDFKit.

## Overview

This service automates the process of generating comprehensive art appraisal reports by:
1. Analyzing artwork images using Google Vision AI
2. Finding and storing similar images
3. Generating expert art descriptions using GPT-4 Vision
4. Creating professional PDF reports

## Project Structure

```
├── index.js                # Main application entry point
├── config.js              # Configuration management
├── routes/
│   ├── appraisal.js      # Appraisal endpoints
│   └── pdf.js            # PDF generation endpoints
├── services/
│   ├── metadata.js       # Metadata processing service
│   ├── openai.js         # OpenAI GPT-4 integration
│   ├── pdf.js           # PDF generation service
│   ├── vision.js         # Google Vision AI integration
│   └── wordpress.js      # WordPress API integration
└── prompts/              # GPT-4 prompts for different report sections
    ├── ad_copy.txt       # Marketing description
    ├── age1.txt          # Age analysis part 1
    ├── age2.txt          # Age analysis part 2
    ├── age_text.txt      # Age description
    ├── authorship.txt    # Authorship analysis
    ├── condition.txt     # Condition assessment
    ├── conclusion1.txt   # Report conclusion part 1
    ├── conclusion2.txt   # Report conclusion part 2
    ├── glossary.txt      # Art terms glossary
    ├── signature1.txt    # Signature analysis part 1
    ├── signature2.txt    # Signature analysis part 2
    ├── style.txt         # Style analysis
    ├── table.txt         # Artwork specifications
    ├── test.txt         # Initial artwork type analysis
    └── valuation_method.txt  # Valuation methodology
```

## API Endpoints

### POST /complete-appraisal-report

Generates metadata and analyzes images for an artwork appraisal.

```json
Request:
{
  "postId": "string" // WordPress post ID
}

Response:
{
  "success": boolean,
  "message": "string",
  "details": {
    "postId": "string",
    "title": "string",
    "visionAnalysis": {
      "success": boolean,
      "similarImagesCount": number,
      "uploadedImageIds": string[]
    },
    "processedFields": [
      {
        "field": "string",
        "status": "success" | "error",
        "error?": "string"
      }
    ]
  }
}
```

### POST /generate-pdf

Generates a PDF report from the appraisal data.

```json
Request:
{
  "postId": "string",      // WordPress post ID
  "session_ID": "string"   // Optional session ID for custom filename
}

Response:
{
  "success": boolean,
  "message": "string"
}
```

The response will be a downloadable PDF file with the appraisal report.

### GET /activate-example

Generates an example PDF report using a predefined post (ID: 141667).

```
Response: Downloadable PDF file
Filename: example_appraisal.pdf
Content-Type: application/pdf
```

This endpoint is useful for:
- Testing the PDF generation system
- Generating sample reports
- Demonstrating the service capabilities

## PDF Report Features

The generated PDF reports include:

### Structure
- Cover page with logo and main artwork image
- Table of contents
- Numbered pages (except cover)
- Professional layout with consistent formatting

### Content Sections
1. Artwork Analysis
2. Age Analysis
3. Condition Assessment
4. Signature Analysis
5. Style Analysis
6. Valuation Methodology
7. Conclusion
8. Glossary

### Security Features
- Watermark on each page
- QR code for verification (last page)
- PDF metadata (title, author, etc.)
- Professional formatting and layout

### Image Handling
- Main artwork image on cover
- Gallery images in grid layout
- Age analysis images
- Signature analysis images

## Requirements

### Environment Variables

Required secrets in Google Cloud Secret Manager:
- `WORDPRESS_API_URL`: WordPress REST API endpoint
- `wp_username`: WordPress username
- `wp_app_password`: WordPress application password
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_VISION_CREDENTIALS`: Google Vision AI service account credentials

### WordPress Configuration

Required ACF fields:
- `main`: Main artwork image
- `age`: Age-related image
- `signature`: Signature image
- `googlevision`: Gallery field for similar images
- Various text fields for metadata (e.g., `age1`, `age2`, `style`, etc.)

### Dependencies

```json
{
  "dependencies": {
    "@google-cloud/secret-manager": "^3.0.0",
    "@google-cloud/vision": "^4.0.0",
    "cors": "^2.8.5",
    "date-fns": "^2.29.3",
    "express": "^4.18.2",
    "form-data": "^4.0.0",
    "handlebars": "^4.7.7",
    "he": "^1.2.0",
    "node-fetch": "^2.6.7",
    "pdfkit": "^0.14.0",
    "pdfkit-table": "^0.1.99",
    "qrcode": "^1.5.3",
    "uuid": "^9.0.0"
  }
}
```

## Testing

Test the endpoints using curl:

```bash
# Test metadata generation
curl -X POST https://appraisals-backend-856401495068.us-central1.run.app/complete-appraisal-report \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID"}'

# Test PDF generation
curl -X POST https://appraisals-backend-856401495068.us-central1.run.app/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"postId": "YOUR_POST_ID", "session_ID": "OPTIONAL_SESSION_ID"}'

# Generate example PDF
curl https://appraisals-backend-856401495068.us-central1.run.app/activate-example \
  --output example_appraisal.pdf
```

## Development

```bash
# Install dependencies
npm install

# Start server
npm start
```

The server runs on port 8080 by default or `PORT` environment variable if set.

## CORS Configuration

Allows requests from:
- `https://appraisers-frontend-856401495068.us-central1.run.app`
- `https://appraisers-task-queue-856401495068.us-central1.run.app`
- `https://appraisers-backend-856401495068.us-central1.run.app`

## Error Handling

The service implements comprehensive error handling:
- Retries for content generation (3 attempts)
- Detailed error logging
- Graceful fallbacks for missing images
- Validation of all input parameters
- Proper HTTP status codes for different error types

## Security

- All API endpoints require proper authentication
- Secrets are managed through Google Cloud Secret Manager
- CORS restrictions limit access to approved domains
- Input validation prevents injection attacks
- File access is restricted to authorized users

## Deployment

The service is deployed on Google Cloud Run:
- Automatic scaling based on load
- HTTPS encryption
- Container-based deployment
- Environment variable management
- Logging and monitoring included