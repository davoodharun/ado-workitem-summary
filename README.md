# Azure DevOps Deployment Summary Generator

This PowerShell script analyzes Azure DevOps work items and generates a summary of Change Request work items that are in "Ready for Implementation" state, along with their linked Pull Requests and Build Pipeline references.

## Prerequisites

- PowerShell 5.1 or higher
- Azure DevOps Personal Access Token (PAT) with appropriate permissions
- Azure DevOps organization URL

## Usage

Run the script with the required parameters:

```powershell
.\Get-DeploymentSummary.ps1 -OrganizationUrl "https://dev.azure.com/your-organization" -PersonalAccessToken "your-personal-access-token"
```

Optional parameters:
- `-ProjectName`: The name of the Azure DevOps project (default: "EU-Change Governance")
- `-Debug`: Switch to enable debug output, showing URL conversion details

Example with all parameters:
```powershell
.\Get-DeploymentSummary.ps1 -OrganizationUrl "https://dev.azure.com/your-organization" -PersonalAccessToken "your-personal-access-token" -ProjectName "EU-Change Governance" -Debug
```

## What the Script Does

The script will:
1. Connect to Azure DevOps using your credentials
2. Find all Change Request work items in "Ready for Implementation" state
3. For each work item, collect linked Pull Requests and Build Pipeline references
4. Convert the internal vstfs:// URLs to browser-friendly URLs that can be opened directly
5. Retrieve detailed information about each Pull Request and Build using the Azure DevOps REST API
6. Generate a JSON summary of the findings

## Output

The script outputs a JSON summary containing:
- Work item ID
- Work item title
- Work item state
- List of linked items with:
  - Browser-friendly URLs
  - Item type (Pull Request, Build, Branch Reference, or Commit)
  - Title
  - Detailed information (for Pull Requests and Builds):
    - Pull Requests: title, status, source branch, target branch, creator, creation date
    - Builds: build number, status, result, start time, finish time, requester

## Notes

- The script specifically looks for Pull Request references between:
  - stage to main
  - ucdstage to ucdprod
  - ucdweb/stage to ucdweb/prod
- Build pipeline references are also included in the summary
- All URLs in the output are converted to browser-friendly format that can be opened directly in a web browser
- The script uses the Azure DevOps REST API to retrieve detailed information about Pull Requests and Builds
- If you're still seeing vstfs:// URLs in the output, run the script with the -Debug parameter to see detailed URL conversion information

## Security Considerations

- The Personal Access Token is passed as a parameter and is not stored in the script
- Consider using Azure Key Vault or other secure methods to manage your PAT in production environments 