# Azure DevOps Deployment Summary Generator

A web application to display work items, pull requests, and builds from an Azure DevOps project.

## Requirements

1. One tab to display a list of work items from an ADO project called "EU-Change Governance" of custom work item type "Change Request"; Work item state should be a dynamic property but set to "Implemented" by default; fields displayed should be at least: title, work item id, # of linked items, created on date, status.
2. Another tab to display list of pull requests that are linked to the work items found in #1. On this tab there should be filters set for the targetBranch of the pull request with default filters of main, ucd/prod, ucdweb/prod, ucdapi/prod, and master. The pull request items should have at least the following fields displayed: ID, Title, Create On Date, Created By, Status, Is Approved. Clicking on a pull request in this table should open a modal that displays the full information abou the pull request including a link to the PR on azure devops
3. Another tab to display a list of builds that are linked to the work items found in #1

Important things to note
1. any urls that start with vsts:// are not accessible by a web browser and should be converted or replaced with browser accessible urls; this might involve extracting the id from the vsts:// url for a pull request and/or build to get more infomration about the pull request or build
2. Remember to encode urls i.e ("EU-Change Governance" to "EU-Change%20Governance")
3. The pull requests and builds linked to the work items in the EU-Change Governance project usually do not beloing to that project and live within another project/repository

## Setup and Usage

### Prerequisites

- Node.js (v14 or later)
- Azure DevOps Personal Access Token (PAT) with appropriate permissions

### Installation

1. Clone the repository
```
git clone <repository-url>
cd deployment-summary
```

2. Install dependencies
```
npm install
```

### Configuration

1. Open the `scripts/fetchData.js` file and update the configuration:
   - Set your Azure DevOps organization name
   - If needed, adjust the project name, work item type, etc.

2. Set your Azure DevOps Personal Access Token as an environment variable:
   - On Windows: `set ADO_PAT=your-personal-access-token`
   - On macOS/Linux: `export ADO_PAT=your-personal-access-token`

### Fetching Data

Run the data fetching script to generate the JSON file:
```
npm run fetch-data
```

This will:
1. Connect to Azure DevOps using your PAT
2. Query work items from the specified project
3. Get associated pull requests and builds
4. Save the data to `public/data/ado-data.json`

### Running the Application

Start the development server:
```
npm run dev
```

The application will be available at http://localhost:3000

### Building for Production

To build for production:
```
npm run build
npm start
```

## Features

- **Work Items Tab**: Displays change request work items with filterable status
- **Pull Requests Tab**: Shows linked pull requests with detailed information in a modal
- **Builds Tab**: Lists all build information connected to the work items

## Structure

- `scripts/fetchData.js` - Script to fetch data from Azure DevOps
- `public/data/ado-data.json` - Generated data file
- `pages/index.js` - Main application page with tabs
- `components/` - React components for each tab
