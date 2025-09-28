const fs = require('fs');
const path = require('path');

// Read the JSON files
const ccSets = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ccSets.json'), 'utf8'));
const tcgSets = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/tcgSets.json'), 'utf8'));

// Create a mapping object
const mapping = {};

// Helper function to normalize strings for comparison
function normalizeString(str) {
    return str.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}

// Helper function to find the best match in tcgSets
function findBestMatch(ccValue, tcgSets) {
    const normalizedCC = normalizeString(ccValue);
    
    // First, try exact match
    for (const tcgValue of tcgSets) {
        if (normalizeString(tcgValue) === normalizedCC) {
            return tcgValue;
        }
    }
    
    // Handle Commander Decks mapping
    if (ccValue.includes('Commander Decks')) {
        // Extract the base name by removing " Commander Decks" and " Variants"
        let baseName = ccValue.replace(/ Commander Decks.*$/, '');
        
        // Look for "Commander: " + baseName pattern
        for (const tcgValue of tcgSets) {
            if (tcgValue.startsWith('Commander: ')) {
                const commanderBase = tcgValue.replace('Commander: ', '');
                if (normalizeString(commanderBase) === normalizeString(baseName)) {
                    return tcgValue;
                }
            }
        }
    }
    
    // Handle Variants mapping - find the base version
    if (ccValue.includes('Variants')) {
        // Remove " Variants" to get the base name
        const baseName = ccValue.replace(/ Variants$/, '');
        
        // First try to find exact match for the base name
        for (const tcgValue of tcgSets) {
            if (normalizeString(tcgValue) === normalizeString(baseName)) {
                return tcgValue;
            }
        }
        
        // If base name has "Commander Decks", try the Commander: pattern
        if (baseName.includes('Commander Decks')) {
            const commanderBase = baseName.replace(/ Commander Decks.*$/, '');
            for (const tcgValue of tcgSets) {
                if (tcgValue.startsWith('Commander: ')) {
                    const commanderBaseTcg = tcgValue.replace('Commander: ', '');
                    if (normalizeString(commanderBaseTcg) === normalizeString(commanderBase)) {
                        return tcgValue;
                    }
                }
            }
        }
    }
    
    // Try partial matching for other cases
    for (const tcgValue of tcgSets) {
        const normalizedTcg = normalizeString(tcgValue);
        
        // Check if ccValue is contained in tcgValue or vice versa
        if (normalizedCC.includes(normalizedTcg) || normalizedTcg.includes(normalizedCC)) {
            return tcgValue;
        }
    }
    
    return null; // No match found
}

// Process each ccSet value
for (const ccValue of ccSets) {
    const match = findBestMatch(ccValue, tcgSets);
    if (match) {
        mapping[ccValue] = match;
    } else {
        console.log(`No match found for: ${ccValue}`);
        mapping[ccValue] = null; // Mark as unmapped
    }
}

// Write the mapping to a new file
const outputPath = path.join(__dirname, '../data/setMapping.json');
fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));

console.log(`Mapping created with ${Object.keys(mapping).length} entries`);
console.log(`Mapped entries: ${Object.values(mapping).filter(v => v !== null).length}`);
console.log(`Unmapped entries: ${Object.values(mapping).filter(v => v === null).length}`);
console.log(`Output saved to: ${outputPath}`);

// Display some examples of the mapping
console.log('\nExample mappings:');
const exampleKeys = Object.keys(mapping).slice(0, 10);
for (const key of exampleKeys) {
    console.log(`"${key}" -> "${mapping[key] || 'NO MATCH'}"`);
}
