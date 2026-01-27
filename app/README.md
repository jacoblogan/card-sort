# TCG Player Data Viewer

A web application for viewing, searching, filtering, and sorting TCG Player CSV export data.

## Features

- **Pagination**: View data in manageable chunks (50 items per page)
- **Search**: Search across Set Name, Product Name, and Condition fields
- **Filtering**: 
  - Filter by Set Name
  - Filter by Condition
  - Filter by price range (Min/Max)
- **Sorting**: Click any column header to sort (ascending/descending)
- **Dynamic CSV Loading**: Automatically finds and loads the CSV file from `../tcgPlayerExport/`

## Running the Application

1. Make sure you have a CSV file in the `tcgPlayerExport` directory
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   node app/server.js
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How It Works

- The server automatically detects the CSV file in the `tcgPlayerExport` directory
- Data is cached in memory for 5 minutes to improve performance
- The frontend communicates with the backend via REST API endpoints:
  - `/api/data` - Get paginated, filtered, and sorted data
  - `/api/filters` - Get available filter options (sets and conditions)

## Displayed Columns

- Set Name
- Product Name
- Condition
- TCG Market Price
