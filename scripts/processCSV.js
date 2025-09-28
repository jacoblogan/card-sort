const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

/**
 * This script will process a TCGPlayer CSV export file and create a card kingdom buylist csv file.
 * Drop the tcgplayer export into data/add and run the script.
 */

// Read the inverted mapping
const invertedMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/invertedSetMapping.json'), 'utf8'));

// Function to parse CSV file
function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

// Function to determine if a card is foil based on condition
function isFoil(condition) {
    return condition && condition.toLowerCase().includes('foil') ? 'yes' : 'no';
}

// Function to get the appropriate edition for a set name based on product name
function getEdition(setName, productName) {
    // First try exact match
    let editions = null;
    if (invertedMapping[setName]) {
        editions = invertedMapping[setName];
    } else {
        // Try case-insensitive match
        for (const [tcgSet, ccSets] of Object.entries(invertedMapping)) {
            if (tcgSet.toLowerCase() === setName.toLowerCase()) {
                editions = ccSets;
                break;
            }
        }
    }
    
    // If no match found, return the original set name
    if (!editions) {
        console.log(`No mapping found for set: "${setName}"`);
        return setName;
    }
    
    // If only one edition, return it
    if (editions.length === 1) {
        return editions[0];
    }
    
    // Check if product name contains parentheses
    const hasParentheses = productName && productName.includes('(');
    
    if (hasParentheses) {
        // If product name has parentheses, use the "Variants" edition
        const variantsEdition = editions.find(edition => edition.includes('Variants'));
        return variantsEdition || editions[0]; // Fallback to first if no variants found
    } else {
        // If no parentheses, use the non-"Variants" edition
        const nonVariantsEdition = editions.find(edition => !edition.includes('Variants'));
        return nonVariantsEdition || editions[0]; // Fallback to first if no non-variants found
    }
}

// Main processing function
async function processCSV() {
    try {
        // Find the CSV file in data/add directory
        const addDir = path.join(__dirname, '../data/add');
        const files = fs.readdirSync(addDir);
        const csvFile = files.find(file => file.endsWith('.csv'));
        
        if (!csvFile) {
            throw new Error('No CSV file found in data/add directory');
        }
        
        const csvPath = path.join(addDir, csvFile);
        console.log(`Processing CSV file: ${csvFile}`);
        
        // Parse the CSV
        const data = await parseCSV(csvPath);
        console.log(`Loaded ${data.length} rows from CSV`);
        
        // Process each row
        const processedData = [];
        
        for (const row of data) {
            const productName = row['Product Name'];
            const setName = row['Set Name'];
            const condition = row['Condition'];
            const totalQuantity = row['Total Quantity'];
            
            // Skip rows with missing essential data
            if (!productName || !setName || !totalQuantity) {
                console.log(`Skipping row with missing data: ${JSON.stringify(row)}`);
                continue;
            }
            
            // Determine foil status
            const foil = isFoil(condition);
            
            // Get the appropriate edition for this set based on product name
            const edition = getEdition(setName, productName);
            
            // Create a single row for this card
            processedData.push({
                title: productName,
                edition: edition,
                foil: foil,
                quantity: totalQuantity
            });
        }
        
        console.log(`Processed ${processedData.length} rows (${data.length} original rows)`);
        
        // Create CSV writer
        const csvWriter = createCsvWriter({
            path: path.join(__dirname, '../data/processedCards.csv'),
            header: [
                {id: 'title', title: 'title'},
                {id: 'edition', title: 'edition'},
                {id: 'foil', title: 'foil'},
                {id: 'quantity', title: 'quantity'}
            ]
        });
        
        // Write the processed data
        await csvWriter.writeRecords(processedData);
        console.log('Processed data written to data/processedCards.csv');
        
        // Display some statistics
        const stats = {
            totalRows: processedData.length,
            uniqueTitles: new Set(processedData.map(row => row.title)).size,
            uniqueEditions: new Set(processedData.map(row => row.edition)).size,
            foilCount: processedData.filter(row => row.foil === 'yes').length,
            nonFoilCount: processedData.filter(row => row.foil === 'no').length
        };
        
        console.log('\nStatistics:');
        console.log(`Total rows: ${stats.totalRows}`);
        console.log(`Unique titles: ${stats.uniqueTitles}`);
        console.log(`Unique editions: ${stats.uniqueEditions}`);
        console.log(`Foil cards: ${stats.foilCount}`);
        console.log(`Non-foil cards: ${stats.nonFoilCount}`);
        
        // Show some examples
        console.log('\nFirst 5 processed rows:');
        processedData.slice(0, 5).forEach((row, index) => {
            console.log(`${index + 1}. ${row.title} | ${row.edition} | ${row.foil} | ${row.quantity}`);
        });
        
    } catch (error) {
        console.error('Error processing CSV:', error);
    }
}

// Run the processing
processCSV();
