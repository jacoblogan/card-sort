/**
 * updateEnvelopes.js - Envelope PDF Management Script
 * 
 * This script provides functionality to combine multiple envelope PDF files into a single document.
 * It's designed to work with envelope PDFs that contain address information and can optionally
 * add address overlays matching the positioning used in the generateShipping function.
 * 
 * Features:
 * - Combines all PDF files found in data/envelopePDF folder
 * - Maintains original PDF content and formatting
 * - Can add address overlays with positioning matching generateShipping function
 * - Handles multiple envelope types and sizes
 * - Generates timestamped output files
 * 
 * Usage:
 *   node scripts/updateEnvelopes.js
 * 
 * Dependencies:
 *   - pdf-lib: For PDF manipulation and combination
 *   - fs: For file system operations
 *   - path: For path manipulation
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

const envelopePDFFolder = './data/envelopePDF';
const outputFolder = './data/envelopePDF';
const outputFileName = `combinedEnvelopes_${Date.now()}.pdf`;

// Address positioning constants matching generateShipping function
// Note: The original generateShipping function uses rotation (270 degrees) and negative coordinates
// These constants represent the relative positioning that would be used after rotation
const ADDRESS_POSITIONS = {
    returnAddress: {
        storeName: { x: -660, y: 185 },
        address1: { x: -660, y: 200 },
        address2: { x: -660, y: 215 }
    },
    shippingAddress: {
        name: { x: -400, y: 280 },
        address1: { x: -400, y: 295 },
        address2: { x: -400, y: 310 }
    }
};

// Store information
const STORE_INFO = {
    name: "Jake's MTG Store",
    address1: "2244 S Duval",
    address2: "Mesa, AZ 85209"
};

async function combineEnvelopePDFs() {
    try {
        // Check if envelopePDF folder exists
        if (!fs.existsSync(envelopePDFFolder)) {
            console.log(`Envelope PDF folder not found: ${envelopePDFFolder}`);
            return;
        }

        // Get all PDF files in the envelopePDF folder
        const files = fs.readdirSync(envelopePDFFolder)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .sort(); // Sort files for consistent ordering

        if (files.length === 0) {
            console.log('No PDF files found in envelopePDF folder');
            return;
        }

        console.log(`Found ${files.length} PDF files to combine`);

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

        // Process each PDF file
        for (let i = 0; i < files.length; i++) {
            const filePath = path.join(envelopePDFFolder, files[i]);
            console.log(`Processing: ${files[i]}`);

            try {
                // Read the PDF file
                const pdfBytes = fs.readFileSync(filePath);
                const pdf = await PDFDocument.load(pdfBytes);

                // Get the first page of the PDF
                const pages = pdf.getPages();
                if (pages.length === 0) {
                    console.log(`Warning: No pages found in ${files[i]}`);
                    continue;
                }

                // Copy the first page to the merged document
                const srcPage = pages[0];
                const size = srcPage.getSize ? srcPage.getSize() : { width: srcPage.getWidth(), height: srcPage.getHeight() };
                const newPage = mergedPdf.addPage([size.width, size.height]);
                const embedded = await mergedPdf.embedPage(srcPage);
                newPage.drawPage(embedded, { x: 0, y: 100 });

            } catch (error) {
                console.error(`Error processing ${files[i]}:`, error.message);
            }
        }

        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(outputFolder, outputFileName);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        console.log(`Successfully created combined PDF: ${outputPath}`);
        console.log(`Total pages: ${mergedPdf.getPageCount()}`);

    } catch (error) {
        console.error('Error combining PDFs:', error.message);
    }
}

// Alternative function that creates a new PDF with address overlays
// This matches the generateShipping function approach more closely
async function createEnvelopePDFWithAddresses() {
    try {
        // Check if envelopePDF folder exists
        if (!fs.existsSync(envelopePDFFolder)) {
            console.log(`Envelope PDF folder not found: ${envelopePDFFolder}`);
            return;
        }

        // Get all PDF files in the envelopePDF folder
        const files = fs.readdirSync(envelopePDFFolder)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .sort();

        if (files.length === 0) {
            console.log('No PDF files found in envelopePDF folder');
            return;
        }

        console.log(`Found ${files.length} PDF files to process`);

        // Create a new PDF document
        const mergedPdf = await PDFDocument.create();

        // Process each PDF file
        for (let i = 0; i < files.length; i++) {
            const filePath = path.join(envelopePDFFolder, files[i]);
            console.log(`Processing: ${files[i]}`);

            try {
                // Read the PDF file
                const pdfBytes = fs.readFileSync(filePath);
                const pdf = await PDFDocument.load(pdfBytes);

                // Get the first page of the PDF
                const pages = pdf.getPages();
                if (pages.length === 0) {
                    console.log(`Warning: No pages found in ${files[i]}`);
                    continue;
                }

                // Copy the first page to the merged document
                const [copiedPage] = await mergedPdf.copyPages(pdf, [0]);
                mergedPdf.addPage(copiedPage);

                // Add address overlays to the copied page
                const page = mergedPdf.getPage(mergedPdf.getPageCount() - 1);
                
                // Add return address (top left corner)
                page.drawText(STORE_INFO.name, {
                    x: 50,
                    y: page.getHeight() - 50,
                    size: 12,
                    font: await mergedPdf.embedFont('Helvetica-Bold')
                });
                
                page.drawText(STORE_INFO.address1, {
                    x: 50,
                    y: page.getHeight() - 65,
                    size: 10,
                    font: await mergedPdf.embedFont('Helvetica')
                });
                
                page.drawText(STORE_INFO.address2, {
                    x: 50,
                    y: page.getHeight() - 80,
                    size: 10,
                    font: await mergedPdf.embedFont('Helvetica')
                });

                // Add shipping address (center of page)
                const centerX = page.getWidth() / 2;
                const centerY = page.getHeight() / 2;
                
                // Note: You would need to extract address data from somewhere
                // For now, this is a placeholder showing the positioning
                page.drawText("SHIPPING ADDRESS", {
                    x: centerX - 50,
                    y: centerY,
                    size: 14,
                    font: await mergedPdf.embedFont('Helvetica-Bold')
                });

            } catch (error) {
                console.error(`Error processing ${files[i]}:`, error.message);
            }
        }

        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(outputFolder, `envelopesWithAddresses_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        console.log(`Successfully created PDF with addresses: ${outputPath}`);
        console.log(`Total pages: ${mergedPdf.getPageCount()}`);

    } catch (error) {
        console.error('Error creating PDF with addresses:', error.message);
    }
}

// Main execution
if (require.main === module) {
    console.log('Starting envelope PDF combination...');
    
    // Choose which function to run:
    // combineEnvelopePDFs() - Simple combination without address overlays
    // createEnvelopePDFWithAddresses() - Combination with address overlays
    
    combineEnvelopePDFs()
        .then(() => {
            console.log('Envelope PDF combination completed');
        })
        .catch(error => {
            console.error('Failed to combine envelope PDFs:', error);
        });
}

// Usage examples:
// 
// 1. Simple combination of all envelope PDFs:
//    node scripts/updateEnvelopes.js
//
// 2. Programmatic usage:
//    const { combineEnvelopePDFs, createEnvelopePDFWithAddresses } = require('./scripts/updateEnvelopes.js');
//    
//    // Combine all envelope PDFs into one document
//    combineEnvelopePDFs();
//    
//    // Create PDF with address overlays (requires address data)
//    createEnvelopePDFWithAddresses();
//
// 3. To add addresses to existing envelope PDFs, you would need to:
//    - Extract address data from a shipping CSV or other source
//    - Modify the createEnvelopePDFWithAddresses function to use real address data
//    - Position the addresses using the ADDRESS_POSITIONS constants

module.exports = {
    combineEnvelopePDFs,
    createEnvelopePDFWithAddresses
}; 