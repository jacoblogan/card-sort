const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Find the CSV file in tcgPlayerExport directory
function findCSVFile() {
  const exportDir = path.join(__dirname, '..', 'tcgPlayerExport');
  const files = fs.readdirSync(exportDir);
  const csvFile = files.find(file => file.endsWith('.csv'));
  if (!csvFile) {
    throw new Error('No CSV file found in tcgPlayerExport directory');
  }
  return path.join(exportDir, csvFile);
}

// Cache for parsed CSV data
let csvDataCache = null;
let csvFullDataCache = null; // Cache for full original data
let csvDataCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Parse CSV file and cache the data
function parseCSV() {
  return new Promise((resolve, reject) => {
    const csvFile = findCSVFile();
    const results = [];
    const fullResults = [];
    
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        // Store full row data
        fullResults.push({ ...row });
        
        // Store display data with TCGplayer Id for matching
        results.push({
          'TCGplayer Id': row['TCGplayer Id'] || '',
          'Set Name': row['Set Name'] || '',
          'Product Name': row['Product Name'] || '',
          'Number': row['Number'] || '',
          'Condition': row['Condition'] || '',
          'TCG Market Price': row['TCG Market Price'] || '',
          'Rarity': row['Rarity'] || '',
          'TCG Low Price': row['TCG Low Price'] || ''
        });
      })
      .on('end', () => {
        csvFullDataCache = fullResults;
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Get cached or fresh data
async function getData() {
  const now = Date.now();
  if (!csvDataCache || !csvDataCacheTime || (now - csvDataCacheTime) > CACHE_DURATION) {
    csvDataCache = await parseCSV();
    csvDataCacheTime = now;
  }
  return csvDataCache;
}

// Get full cached data (for CSV generation)
async function getFullData() {
  const now = Date.now();
  if (!csvFullDataCache || !csvDataCacheTime || (now - csvDataCacheTime) > CACHE_DURATION) {
    await getData(); // This will populate csvFullDataCache
  }
  return csvFullDataCache;
}

// API endpoint to get paginated, filtered, and sorted data
app.get('/api/data', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const search = (req.query.search || '').toLowerCase();
    const sortBy = req.query.sortBy || '';
    const sortOrder = req.query.sortOrder || 'asc';
    const filterSet = req.query.filterSet || '';
    const filterCondition = req.query.filterCondition || '';
    const filterPriceMin = parseFloat(req.query.filterPriceMin) || null;
    const filterPriceMax = parseFloat(req.query.filterPriceMax) || null;

    let data = await getData();

    // Apply search filter
    if (search) {
      data = data.filter(row => 
        (row['Set Name'] || '').toLowerCase().includes(search) ||
        (row['Product Name'] || '').toLowerCase().includes(search) ||
        (row['Number'] || '').toLowerCase().includes(search) ||
        (row['Condition'] || '').toLowerCase().includes(search)
      );
    }

    // Apply filters
    if (filterSet) {
      data = data.filter(row => row['Set Name'] === filterSet);
    }
    if (filterCondition) {
      data = data.filter(row => row['Condition'] === filterCondition);
    }
    if (filterPriceMin !== null) {
      data = data.filter(row => {
        const price = parseFloat(row['TCG Market Price']);
        return !isNaN(price) && price >= filterPriceMin;
      });
    }
    if (filterPriceMax !== null) {
      data = data.filter(row => {
        const price = parseFloat(row['TCG Market Price']);
        return !isNaN(price) && price <= filterPriceMax;
      });
    }

    // Apply sorting
    if (sortBy) {
      data.sort((a, b) => {
        let aVal = a[sortBy] || '';
        let bVal = b[sortBy] || '';
        
        // Handle numeric sorting for price
        if (sortBy === 'TCG Market Price') {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    // Calculate pagination
    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    res.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get unique values for filters
app.get('/api/filters', async (req, res) => {
  try {
    const data = await getData();
    
    const sets = [...new Set(data.map(row => row['Set Name']).filter(Boolean))].sort();
    const conditions = [...new Set(data.map(row => row['Condition']).filter(Boolean))].sort();
    
    res.json({
      sets,
      conditions
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to generate inventory CSV
app.post('/api/generate-inventory', async (req, res) => {
  try {
    const quantities = req.body.quantities; // Object mapping TCGplayer Id to quantity
    
    if (!quantities || typeof quantities !== 'object') {
      return res.status(400).json({ error: 'Invalid quantities data' });
    }

    // Ensure we have full data cached
    await getFullData();

    // Filter rows that have quantity > 0
    const rowsToExport = csvFullDataCache.filter(row => {
      const id = row['TCGplayer Id'];
      const quantity = parseInt(quantities[id]) || 0;
      return quantity > 0;
    });

    if (rowsToExport.length === 0) {
      return res.status(400).json({ error: 'No rows with quantity > 0' });
    }

    // Get CSV headers from first row
    const headers = Object.keys(csvFullDataCache[0]).map(key => ({
      id: key,
      title: key
    }));

    // Prepare data for CSV export
    const csvData = rowsToExport.map(row => {
      const id = row['TCGplayer Id'];
      const quantity = parseInt(quantities[id]) || 0;
      const rarity = row['Rarity'] || '';
      
      // Calculate TCG Marketplace Price
      const marketPriceStr = (row['TCG Market Price'] || '').trim();
      const lowPriceStr = (row['TCG Low Price'] || '').trim();
      const marketPrice = marketPriceStr ? parseFloat(marketPriceStr) : 0;
      const lowPrice = lowPriceStr ? parseFloat(lowPriceStr) : 0;
      
      let rarityMultiplier = 0.24;
      if (rarity === 'M') {
        rarityMultiplier = 0.4;
      } else if (rarity === 'R') {
        rarityMultiplier = 0.3;
      }
      
      // Get the highest value between market price, low price, and rarity multiplier
      const marketplacePrice = Math.max(
        isNaN(marketPrice) ? 0 : marketPrice,
        isNaN(lowPrice) ? 0 : lowPrice,
        rarityMultiplier
      );

      // Create new row with updated values
      const newRow = { ...row };
      newRow['Total Quantity'] = quantity.toString();
      newRow['Add to Quantity'] = quantity.toString();
      newRow['TCG Marketplace Price'] = marketplacePrice.toFixed(2);

      return newRow;
    });

    // Ensure data/add directory exists
    const addDir = path.join(__dirname, '..', 'data', 'add');
    if (!fs.existsSync(addDir)) {
      fs.mkdirSync(addDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `inventory_${timestamp}.csv`;
    const filepath = path.join(addDir, filename);

    // Write CSV file
    const csvWriter = createCsvWriter({
      path: filepath,
      header: headers
    });

    await csvWriter.writeRecords(csvData);

    res.json({
      success: true,
      filename,
      rowsExported: csvData.length,
      message: `Inventory CSV generated successfully: ${filename}`
    });
  } catch (error) {
    console.error('Error generating inventory CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
