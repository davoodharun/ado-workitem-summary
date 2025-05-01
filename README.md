# Azure DevOps Deployment Summary Generator

A web application to display work items, pull requests, and builds from an Azure DevOps project.

## Features

- **Work Items Tab**: Displays change request work items with key information including:
  - Work item ID and title
  - Status with color-coded badges
  - Technical Lead
  - Date to PROD
  - Project Name
  - Impacted Areas
  - Creation date
  - Linked PR/build count
  - Detailed modal view

- **Pull Requests Tab**: Shows linked pull requests with:
  - Multi-select target branch filtering (defaults include main, ucd/prod, ucdweb/prod, ucdapi/prod, master)
  - Human-readable PR status with color coding (Active, Abandoned, Completed, Draft)
  - Approval status tracking
  - Detailed modal view with work item links

- **Builds Tab**: Lists build information with:
  - Build number and status
  - Build result with appropriate color coding
  - Project and repository information

- **UI Features**:
  - Dark mode by default with color mode toggle
  - Sortable tables with direction indicators
  - Responsive design

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

3. Install required packages for dark mode
```
npm install @chakra-ui/icons
```

### Configuration

1. Set your Azure DevOps Personal Access Token as an environment variable:
   - On Windows: `set ADO_PAT=your-personal-access-token`
   - On macOS/Linux: `export ADO_PAT=your-personal-access-token`

2. (Optional) Configure additional environment variables to customize the data fetching:
   - `ADO_ORG` - Your Azure DevOps organization name (default: 'exelontfs')
   - `ADO_PROJECT` - Project name (default: 'EU-Change Governance')
   - `WORK_ITEM_TYPE` - Work item type (default: 'Change Request')
   - `DEFAULT_STATE` - Default state filter (default: 'Implemented')
   - `MAX_ITEMS` - Maximum number of items to fetch (default: 50)

### Fetching Data

Run the data fetching script to generate the JSON file:

```
npm run fetch-data
```

Or with custom parameters:

```
npm run fetch-data -- --pat YOUR_PAT --org YOUR_ORG --project "YOUR PROJECT" --max 100
```

Available parameters:
- `--pat` - Azure DevOps Personal Access Token
- `--org` - Azure DevOps organization name
- `--project` - Project name
- `--type` - Work item type
- `--state` - Default state
- `--max` - Maximum number of items to fetch
- `--help` - Display help information

The script will:
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

## Important Notes

1. Any URLs that start with vsts:// are automatically converted to browser-accessible URLs
2. The application will use sample data if no PAT is provided or if API access fails
3. The application uses a dark theme by default with an option to toggle to light mode

## Structure

- `scripts/fetchData.js`