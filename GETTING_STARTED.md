# Getting Started with Azure DevOps Deployment Summary

This guide will help you set up and run the Azure DevOps Deployment Summary application.

## Prerequisites

Before you begin, ensure you have the following:

1. **Node.js**: Version 14.x or later
2. **Azure DevOps Account**: With access to the "EU-Change Governance" project
3. **Personal Access Token (PAT)**: With permissions to read work items, pull requests, and builds

## Step 1: Set Up Your Environment

1. Clone the repository:
   ```
   git clone <repository-url>
   cd deployment-summary
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the setup script:
   ```
   node setup.js
   ```
   
   This script will:
   - Create necessary directories
   - Prompt you for your Azure DevOps organization name
   - Prompt you for your Personal Access Token (PAT)
   - Configure the application with these values

## Step 2: Fetch Data from Azure DevOps

1. Run the data fetching script:
   ```
   npm run fetch-data
   ```

   This will:
   - Connect to Azure DevOps using your PAT
   - Query work items from the "EU-Change Governance" project
   - Get linked pull requests and builds
   - Save all data to a local JSON file (`public/data/ado-data.json`)

   > Note: You can re-run this command anytime to refresh the data.

## Step 3: Run the Web Application

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and go to [http://localhost:3000](http://localhost:3000)

## Using the Application

The application has three main tabs:

1. **Work Items**: View Change Request work items with status filtering
   - Default filter is set to "Implemented"
   - Each work item shows title, ID, linked items count, created date, and status

2. **Pull Requests**: View pull requests linked to the work items
   - Filter by target branch (main, ucd/prod, ucdweb/prod, ucdapi/prod, master)
   - Click "Details" to see full information in a modal
   - Links to Azure DevOps are properly formatted for browser access

3. **Builds**: View builds linked to the work items
   - Shows build ID, number, definition, dates, status, and result
   - Links to Azure DevOps are properly formatted for browser access

## Troubleshooting

### No Data Displayed

If you don't see any data in the application:

1. Check that the data file exists:
   - Look for `public/data/ado-data.json`
   - If missing, run `npm run fetch-data`

2. Check console for errors:
   - Open browser developer tools (F12)
   - Look for error messages in the console

### Authentication Issues

If the data fetching script fails with authentication errors:

1. Verify your PAT has the necessary permissions:
   - Work Items (read)
   - Code (read)
   - Build (read)

2. Ensure your PAT hasn't expired

3. Update your PAT:
   - Edit the `.env` file
   - Run the setup script again: `node setup.js`

## Production Deployment

To deploy to production:

1. Build the application:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm start
   ```

Alternatively, you can deploy to platforms like Vercel or Netlify, but remember to:
- Run the data fetching script before deployment
- Include the data file in your deployment 