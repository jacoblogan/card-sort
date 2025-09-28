const fs = require('fs');
const path = require('path');

// Read the setMapping.json file
const setMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/setMapping.json'), 'utf8'));

// Create the inverted mapping
const invertedMapping = {};

// Process each entry in the original mapping
for (const [ccSet, tcgSet] of Object.entries(setMapping)) {
    // Skip null values (unmapped entries)
    if (tcgSet === null) {
        continue;
    }
    
    // If this TCG set doesn't exist in our inverted mapping yet, create an empty array
    if (!invertedMapping[tcgSet]) {
        invertedMapping[tcgSet] = [];
    }
    
    // Add the CC set to the array for this TCG set
    invertedMapping[tcgSet].push(ccSet);
}

// Sort the arrays for better readability
for (const tcgSet in invertedMapping) {
    invertedMapping[tcgSet].sort();
}

// Write the inverted mapping to a new file
const outputPath = path.join(__dirname, '../data/invertedSetMapping.json');
fs.writeFileSync(outputPath, JSON.stringify(invertedMapping, null, 2));

console.log(`Inverted mapping created with ${Object.keys(invertedMapping).length} TCG sets`);
console.log(`Total CC sets mapped: ${Object.values(invertedMapping).flat().length}`);
console.log(`Output saved to: ${outputPath}`);

// Display some statistics
const stats = {};
for (const [tcgSet, ccSets] of Object.entries(invertedMapping)) {
    const count = ccSets.length;
    if (!stats[count]) {
        stats[count] = 0;
    }
    stats[count]++;
}

console.log('\nMapping distribution:');
for (const [count, frequency] of Object.entries(stats).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
    console.log(`${count} CC set(s) mapped to TCG set: ${frequency} TCG set(s)`);
}

// Display some examples
console.log('\nExample mappings:');
const exampleKeys = Object.keys(invertedMapping).slice(0, 5);
for (const key of exampleKeys) {
    console.log(`"${key}": [${invertedMapping[key].map(s => `"${s}"`).join(', ')}]`);
}

// Find TCG sets with multiple CC sets
const multipleMappings = Object.entries(invertedMapping).filter(([tcgSet, ccSets]) => ccSets.length > 1);
if (multipleMappings.length > 0) {
    console.log('\nTCG sets with multiple CC set mappings:');
    multipleMappings.slice(0, 5).forEach(([tcgSet, ccSets]) => {
        console.log(`"${tcgSet}": [${ccSets.map(s => `"${s}"`).join(', ')}]`);
    });
}
