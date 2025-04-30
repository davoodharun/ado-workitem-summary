const fs = require('fs');
const path = require('path');
const { getPersonalAccessTokenHandler, WebApi } = require('azure-devops-node-api');
const axios = require('axios');

// Parse command line arguments
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.substring(2);
    const value = i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : true;
    argMap[key] = value;
    if (value !== true) i++; // Skip next item if it's a value
  }
}

// Configuration - Update these values
const config = {
  organization: argMap.org || process.env.ADO_ORG || 'exelontfs', // Your ADO organization name
  project: argMap.project || process.env.ADO_PROJECT || 'EU-Change Governance', // Project name
  pat: argMap.pat || process.env.ADO_PAT || '', // Personal Access Token from environment variable
  apiVersion: '7.0',
  workItemType: argMap.type || process.env.WORK_ITEM_TYPE || 'Change Request',
  defaultState: argMap.state || process.env.DEFAULT_STATE || 'Implemented',
  targetBranches: ['main', 'ucd/prod', 'ucdweb/prod', 'ucdapi/prod', 'master'],
  maxItems: argMap.max ? parseInt(argMap.max) : (process.env.MAX_ITEMS ? parseInt(process.env.MAX_ITEMS) : 50) // Maximum number of work items to fetch
};

// Display configuration
console.log('Running with configuration:');
console.log(JSON.stringify(config, null, 2));

// Function to print usage
function printUsage() {
  console.log(`
Usage: node fetchData.js [options]

Options:
  --pat <token>      Azure DevOps Personal Access Token (or use ADO_PAT env var)
  --org <org>        Azure DevOps organization name (or use ADO_ORG env var)
  --project <name>   Project name (or use ADO_PROJECT env var)
  --type <type>      Work item type (or use WORK_ITEM_TYPE env var)
  --state <state>    Default state (or use DEFAULT_STATE env var)
  --max <number>     Maximum number of items to fetch (or use MAX_ITEMS env var)
  --help             Display this help message

Examples:
  node fetchData.js --max 10
  node fetchData.js --state "Done" --max 100
  node fetchData.js --org "myorg" --project "MyProject" --max 50
  `);
}

// Check for help flag
if (argMap.help) {
  printUsage();
  process.exit(0);
}

// Function to create/use sample data when we can't use the API
function useSampleData() {
  console.log('Using sample data since no PAT was provided or due to API error');
  
  // Create data directory if it doesn't exist
  const dataDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const outputFile = path.join(dataDir, 'ado-data.json');
  
  // If sample data already exists, use it
  if (fs.existsSync(outputFile)) {
    console.log(`Using existing sample data from ${outputFile}`);
    return;
  }
  
  // Otherwise create new sample data
  const sampleData = {
    "workItems": [
      {
        "id": 1001,
        "title": "Update authentication service",
        "state": "Implemented",
        "createdDate": "2023-10-15T08:30:00.000Z",
        "technicalLead": "Jane Smith",
        "dateToProd": "2023-11-01T00:00:00.000Z",
        "projectName": "Authentication Service Update",
        "impactedTechnicalAreas": "Security, Authentication, API",
        "relations": [
          {
            "rel": "ArtifactLink",
            "url": "vsts://organization/project/pullrequests/2001",
            "attributes": {
              "name": "Pull Request"
            }
          },
          {
            "rel": "ArtifactLink",
            "url": "vsts://organization/project/build/3001",
            "attributes": {
              "name": "Build"
            }
          }
        ]
      },
      {
        "id": 1002,
        "title": "Fix critical bug in payment system",
        "state": "Implemented",
        "createdDate": "2023-10-16T09:45:00.000Z",
        "technicalLead": "John Doe",
        "dateToProd": "2023-10-20T00:00:00.000Z",
        "projectName": "Payment Services",
        "impactedTechnicalAreas": "Checkout, Payment Processing, Database",
        "relations": [
          {
            "rel": "ArtifactLink",
            "url": "vsts://organization/project/pullrequests/2002",
            "attributes": {
              "name": "Pull Request"
            }
          },
          {
            "rel": "ArtifactLink",
            "url": "vsts://organization/project/build/3002",
            "attributes": {
              "name": "Build"
            }
          }
        ]
      },
      {
        "id": 1003,
        "title": "Implement new dashboard feature",
        "state": "In Progress",
        "createdDate": "2023-10-17T11:20:00.000Z",
        "technicalLead": "Mike Johnson",
        "dateToProd": null,
        "projectName": "User Dashboard",
        "impactedTechnicalAreas": "Frontend, Analytics, Reporting",
        "relations": [
          {
            "rel": "ArtifactLink",
            "url": "vsts://organization/project/pullrequests/2003",
            "attributes": {
              "name": "Pull Request"
            }
          }
        ]
      }
    ],
    "pullRequests": [
      {
        "id": 2001,
        "title": "Auth service update and fixes",
        "description": "This PR updates the authentication service with improved security features.",
        "status": "completed",
        "creationDate": "2023-10-15T10:15:00.000Z",
        "createdBy": "Jane Smith",
        "sourceBranch": "feature/auth-update",
        "targetBranch": "main",
        "isApproved": true,
        "url": "vsts://organization/project/pullrequests/2001",
        "relatedWorkItems": [1001]
      },
      {
        "id": 2002,
        "title": "Fix payment system bug",
        "description": "Critical fix for payment processing issue affecting checkout.",
        "status": "completed",
        "creationDate": "2023-10-16T11:30:00.000Z",
        "createdBy": "John Doe",
        "sourceBranch": "hotfix/payment-bug",
        "targetBranch": "master",
        "isApproved": true,
        "url": "vsts://organization/project/pullrequests/2002",
        "relatedWorkItems": [1002]
      },
      {
        "id": 2003,
        "title": "New dashboard implementation",
        "description": "Adding new dashboard features for better data visualization.",
        "status": "active",
        "creationDate": "2023-10-17T13:45:00.000Z",
        "createdBy": "Mike Johnson",
        "sourceBranch": "feature/dashboard",
        "targetBranch": "ucd/prod",
        "isApproved": false,
        "url": "vsts://organization/project/pullrequests/2003",
        "relatedWorkItems": [1003]
      }
    ],
    "builds": [
      {
        "id": 3001,
        "buildNumber": "20231015.1",
        "status": "completed",
        "result": "succeeded",
        "startTime": "2023-10-15T11:30:00.000Z",
        "finishTime": "2023-10-15T11:45:00.000Z",
        "definition": {
          "id": 101,
          "name": "Auth Service Build"
        },
        "repository": {
          "id": "repo-auth",
          "name": "AuthService"
        },
        "url": "vsts://organization/project/build/3001",
        "relatedWorkItems": [1001]
      },
      {
        "id": 3002,
        "buildNumber": "20231016.1",
        "status": "completed",
        "result": "succeeded",
        "startTime": "2023-10-16T13:15:00.000Z",
        "finishTime": "2023-10-16T13:30:00.000Z",
        "definition": {
          "id": 102,
          "name": "Payment Service Build"
        },
        "repository": {
          "id": "repo-payment",
          "name": "PaymentService"
        },
        "url": "vsts://organization/project/build/3002",
        "relatedWorkItems": [1002]
      }
    ]
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(sampleData, null, 2));
  console.log(`Sample data file created at ${outputFile}`);
}

// Check for PAT and use sample data if not available
if (!config.pat) {
  console.log(config);
  console.warn('Warning: ADO_PAT environment variable not set. Using sample data instead.');
  useSampleData();
  process.exit(0);
}

// Create connection to Azure DevOps
const orgUrl = `https://dev.azure.com/${config.organization}`;
const authHandler = getPersonalAccessTokenHandler(config.pat);
const connection = new WebApi(orgUrl, authHandler);

// Main function to fetch all data
async function fetchData() {
  try {
    console.log('Connecting to Azure DevOps...');
    
    // Get clients
    const witClient = await connection.getWorkItemTrackingApi();
    const gitClient = await connection.getGitApi();
    const buildClient = await connection.getBuildApi();
    
    console.log('Fetching work items...');
    
    // Query work items - WIQL query for Change Requests with state Implemented
    const wiqlQuery = {
      query: `SELECT [System.Id], [System.Title], [System.State], [System.CreatedDate] 
              FROM WorkItems 
              WHERE [System.TeamProject] = '${config.project}' 
              AND [System.WorkItemType] = '${config.workItemType}' 
              AND [System.State] = '${config.defaultState}'
              ORDER BY [System.Id] DESC`
    };
    
    const queryResult = await witClient.queryByWiql(wiqlQuery);
    
    if (!queryResult.workItems || queryResult.workItems.length === 0) {
      console.log('No work items found with the specified criteria.');
      // Create empty data file
      const data = { workItems: [], pullRequests: [], builds: [] };
      const dataDir = path.join(__dirname, '..', 'public', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const outputFile = path.join(dataDir, 'ado-data.json');
      fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      console.log(`No data found. Empty data file created at ${outputFile}`);
      return;
    }
    
    // Limit to config.maxItems
    const totalItemsFound = queryResult.workItems.length;
    const workItemsToProcess = queryResult.workItems.slice(0, config.maxItems);
    console.log(`Found ${totalItemsFound} work items. Limiting to ${workItemsToProcess.length} items as configured.`);
    
    // Prepare the data structure
    const data = {
      workItems: [],
      pullRequests: [],
      builds: []
    };
    
    // Instead of batch fetching, get work items one by one
    const workItemIds = workItemsToProcess.map(wi => wi.id);
    console.log(`Will fetch details for these work items: ${workItemIds.slice(0, 10).join(', ')}${workItemIds.length > 10 ? '...' : ''}`);
    
    // Process work items in smaller batches for reliability
    const batchSize = 10;
    for (let i = 0; i < workItemIds.length; i += batchSize) {
      const batchIds = workItemIds.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(workItemIds.length/batchSize)}, items ${i+1}-${Math.min(i+batchSize, workItemIds.length)}`);
      
      // Process each work item individually
      for (const workItemId of batchIds) {
        try {
          console.log(`Fetching work item ${workItemId}...`);
          const workItem = await witClient.getWorkItem(workItemId, null, null, 'all');
          
          if (!workItem) {
            console.warn(`Work item ${workItemId} was not found or returned null`);
            continue;
          }
          
          console.log(`Successfully retrieved work item ${workItemId}: ${workItem.fields['System.Title']}`);
          
          // Try different possible field names for Technical Lead
          const technicalLeadField = 
            workItem.fields['Custom.TechnicalLead'] || 
            workItem.fields['Microsoft.VSTS.Common.TechnicalLead'] ||
            workItem.fields['Exelon.TechnicalLead'] ||
            workItem.fields['System.AssignedTo'] ||
            workItem.fields['TechnicalLead'] ||
            null;
          
          // Basic work item data
          const workItemData = {
            id: workItem.id,
            title: workItem.fields && workItem.fields['System.Title'] ? workItem.fields['System.Title'] : 'Unknown Title',
            state: workItem.fields && workItem.fields['System.State'] ? workItem.fields['System.State'] : 'Unknown State',
            createdDate: workItem.fields && workItem.fields['System.CreatedDate'] ? workItem.fields['System.CreatedDate'] : new Date().toISOString(),
            technicalLead: technicalLeadField || 'Not Assigned',
            // Add new custom fields
            dateToProd: workItem.fields && (
              workItem.fields['DatetoPROD'] || 
              workItem.fields['Custom.DatetoPROD'] || 
              workItem.fields['Date to PROD'] || 
              workItem.fields['Microsoft.VSTS.Scheduling.DateToProd'] || 
              workItem.fields['Exelon.DateToPROD'] ||
              workItem.fields['Custom.DateToProd'] || 
              workItem.fields['DateToPROD'] ||
              workItem.fields['DateToProd']
            ),
            projectName: workItem.fields && (
              workItem.fields['Custom.ProjectName'] || 
              workItem.fields['System.TeamProject'] || 
              workItem.fields['Exelon.ProjectName'] ||
              workItem.fields['ProjectName'] ||
              workItem.fields['Project Name']
            ),
            impactedTechnicalAreas: workItem.fields && (
              workItem.fields['Custom.ImpactedAreas'] || 
              workItem.fields['Impacted Areas'] || 
              workItem.fields['Exelon.ImpactedAreas'] ||
              workItem.fields['ImpactedAreas'] ||
              workItem.fields['Custom.ImpactedTechnicalAreas'] || 
              workItem.fields['Exelon.ImpactedTechnicalAreas'] ||
              workItem.fields['ImpactedTechnicalAreas']
            ),
            relations: workItem.relations || []
          };
          
          data.workItems.push(workItemData);
          
          // Process relations to find artifacts (PRs, builds)
          if (workItem.relations && workItem.relations.length > 0) {
            //console.log(`Work item ${workItemId} has ${workItem.relations.length} relations`);
            //console.log(`Relations data:`, JSON.stringify(workItem.relations, null, 2));
            
            // Enhance relation logging
            const relationTypes = {};
            workItem.relations.forEach(rel => {
              const type = rel.rel || 'unknown';
              relationTypes[type] = (relationTypes[type] || 0) + 1;
            });
            // console.log(`Relation types:`, relationTypes);

            for (const relation of workItem.relations) {
              //console.log(`Processing relation: ${relation.rel}, URL: ${relation.url || 'none'}`);
              
              // Extract artifact type and URL
              if (relation.url) {
                //console.log(`Checking URL: ${relation.url}`);
                
                // More robust way to check for pull requests
                const isPullRequest = 
                  relation.url.includes('pullRequests') || 
                  relation.url.includes('pullrequest') || 
                  (relation.attributes && relation.attributes.name === 'Pull Request');
                
                // More robust way to check for builds
                const isBuild = 
                  relation.url.includes('/build/') || 
                  relation.url.includes('/_build/') || 
                  (relation.attributes && relation.attributes.name === 'Build');
                
                if (isPullRequest) {
                  //console.log(`Found pull request relation in URL: ${relation.url}`);
                  try {
                    // Handle different URL formats
                    let prId = null;

                    // Handle vstfs:/// URLs - specifically for pull requests
                    if (relation.url.startsWith('vstfs:///Git/PullRequestId/')) {
                      // These URLs use format: vstfs:///Git/PullRequestId/guid%2Fguid%2FpullRequestId
                      const parts = relation.url.split('%2F');
                      if (parts.length > 0) {
                        // The last part should contain the PR ID
                        const lastPart = parts[parts.length - 1];
                        prId = parseInt(lastPart);
                        //console.log(`Extracted PR ID from vstfs URL: ${prId}`);
                      }
                    } else {
                      // Handle regular URLs by parsing them
                      try {
                        const urlObj = new URL(relation.url);
                        const pathParts = urlObj.pathname.split('/');
                        
                        // Find the PR ID - it's usually the last number in the path
                        for (let i = pathParts.length - 1; i >= 0; i--) {
                          const part = pathParts[i];
                          const num = parseInt(part);
                          if (!isNaN(num)) {
                            prId = num;
                            break;
                          }
                        }
                      } catch (urlError) {
                        console.warn(`Error parsing URL: ${urlError.message}`);
                      }
                    }
                    
                    if (!prId) {
                      console.warn(`Could not extract PR ID from URL: ${relation.url}`);
                      return;
                    }
                    
                    //console.log(`Extracted PR ID: ${prId}`);
                    
                    // Try to get PR details using both standard API and REST API
                    try {
                      // First try the standard API
                      //console.log(`Trying to get PR ${prId} using standard API...`);
                      const pr = await gitClient.getPullRequestById(prId);
                      
                      if (pr) {
                        //console.log(`Successfully retrieved PR ${prId} using standard API: ${pr.title}`);
                        
                        // Extract repository information
                        const repository = pr.repository || {};
                        const project = repository.project || {};
                        
                        // Get project and repository names for better URLs
                        const projectName = project.name || '';
                        const repoName = repository.name || '';
                        
                        //console.log(`PR ${prId} belongs to project: ${projectName}, repository: ${repoName}`);
                        
                        // Process the PR as before
                        if (!data.pullRequests.some(p => p.id === pr.pullRequestId)) {
                          data.pullRequests.push({
                            id: pr.pullRequestId,
                            title: pr.title || 'Unknown Title',
                            description: pr.description || '',
                            status: pr.status || 'unknown',
                            creationDate: pr.creationDate || new Date().toISOString(),
                            createdBy: pr.createdBy?.displayName || 'Unknown',
                            sourceBranch: pr.sourceRefName ? pr.sourceRefName.replace('refs/heads/', '') : 'unknown',
                            targetBranch: pr.targetRefName ? pr.targetRefName.replace('refs/heads/', '') : 'unknown',
                            isApproved: pr.reviewers?.some(r => r.vote === 10) || false,
                            url: relation.url,
                            relatedWorkItems: [workItem.id],
                            // Add project and repository information
                            projectName: projectName,
                            repositoryName: repoName
                          });
                        } else {
                          // Update existing PR
                          const existingPR = data.pullRequests.find(p => p.id === pr.pullRequestId);
                          if (!existingPR.relatedWorkItems.includes(workItem.id)) {
                            existingPR.relatedWorkItems.push(workItem.id);
                          }
                          // Also update project/repo info if not present
                          if (!existingPR.projectName || !existingPR.repositoryName) {
                            existingPR.projectName = projectName;
                            existingPR.repositoryName = repoName;
                          }
                        }
                      } else {
                        // Fall back to REST API if standard API returns null
                        //console.log(`PR ${prId} not found via standard API, trying REST API...`);
                        await fetchPullRequestViaREST(prId, relation.url, workItem.id, data);
                      }
                    } catch (prError) {
                      console.warn(`Could not fetch details for PR ${prId} using standard API: ${prError.message}`);
                      // Try REST API as fallback
                      //console.log(`Trying REST API for PR ${prId}...`);
                      await fetchPullRequestViaREST(prId, relation.url, workItem.id, data);
                    }
                  } catch (e) {
                    console.warn(`Could not process pull request relation: ${e.message}`);
                  }
                }
                
                if (isBuild) {
                  try {
                    // Extract build ID from URL
                    let buildId = null;
                    let projectName = null;
                    
                    // Handle vstfs:/// URLs specifically for builds
                    if (relation.url.startsWith('vstfs:///Build/Build/')) {
                      // These URLs use format: vstfs:///Build/Build/buildId
                      const parts = relation.url.split('/');
                      buildId = parseInt(parts[parts.length - 1]);
                      // For vstfs URLs, we don't have project info, so we'll try multiple projects in fetchBuildViaREST
                      projectName = null; 
                    } else {
                      // Handle regular URLs by parsing them
                      try {
                        const urlObj = new URL(relation.url);
                        const pathParts = urlObj.pathname.split('/');
                        
                        // Find the build ID - it's usually the last number in the path
                        for (let i = pathParts.length - 1; i >= 0; i--) {
                          const part = pathParts[i];
                          const num = parseInt(part);
                          if (!isNaN(num)) {
                            buildId = num;
                            // Try to find project name - typically 2-4 segments before the build ID
                            for (let j = Math.max(0, i - 4); j < i; j++) {
                              if (pathParts[j] && pathParts[j] !== '' && pathParts[j] !== '_build') {
                                projectName = pathParts[j];
                                break;
                              }
                            }
                            break;
                          }
                        }
                      } catch (urlError) {
                        console.warn(`Error parsing URL: ${urlError.message}`);
                      }
                    }
                    
                    if (!buildId) {
                      console.warn(`Could not extract build ID from URL: ${relation.url}`);
                      return;
                    }
                    
                    if (!projectName) {
                      // If we couldn't find project name, use a default
                      projectName = config.project;
                    }
                    
                    // Get build details
                    try {
                      // First try to fetch the build using the REST API
                      const success = await fetchBuildViaREST(buildId, projectName, relation.url, workItem.id, data);
                      
                      // Only try the SDK approach if REST API failed
                      if (!success) {
                        const build = await buildClient.getBuild(buildId, projectName);
                        
                        if (!build) {
                          console.warn(`Build ${buildId} was not found or returned null`);
                          continue;
                        }
                        
                        // Extract the true project name from the build data if available
                        let trueProjectName = null;
                        
                        if (build.project && build.project.name) {
                          trueProjectName = build.project.name;
                        } else {
                          // Fall back to the project name we used to find the build
                          trueProjectName = projectName || 'Unknown';
                        }
                        
                        // Generate a browser-accessible URL with the correct project name
                        const browserUrl = `https://dev.azure.com/${config.organization}/${encodeURIComponent(trueProjectName)}/_build/results?buildId=${build.id}`;
                        
                        // Check if build already exists in our collection
                        if (!data.builds.some(b => b.id === build.id)) {
                          // Add build data
                          data.builds.push({
                            id: build.id,
                            buildNumber: build.buildNumber || 'Unknown',
                            status: build.status || 'unknown',
                            result: build.result || 'unknown',
                            startTime: build.startTime || new Date().toISOString(),
                            finishTime: build.finishTime || new Date().toISOString(),
                            definition: {
                              id: build.definition?.id || 0,
                              name: build.definition?.name || 'Unknown'
                            },
                            repository: {
                              id: build.repository?.id || 'unknown',
                              name: build.repository?.name || 'Unknown'
                            },
                            project: trueProjectName,
                            url: browserUrl,
                            originalUrl: relation.url,
                            relatedWorkItems: [workItem.id]
                          });
                        } else {
                          // Update existing build to add the work item relationship
                          const existingBuild = data.builds.find(b => b.id === build.id);
                          if (!existingBuild.relatedWorkItems.includes(workItem.id)) {
                            existingBuild.relatedWorkItems.push(workItem.id);
                          }
                        }
                      }
                    } catch (buildError) {
                      console.warn(`Could not fetch details for build ${buildId}: ${buildError.message}`);
                      // Try REST API as final fallback if not already tried
                      await fetchBuildViaREST(buildId, projectName, relation.url, workItem.id, data);
                    }
                  } catch (e) {
                    console.warn(`Could not process build relation: ${e.message}`);
                  }
                }
              }
            }
          } else {
            // No relations for this work item
          }
        } catch (error) {
          console.warn(`Error processing work item ${workItemId}: ${error.message}`);
        }
      }
      
      // Save intermediate results after each batch
      if (i + batchSize < workItemIds.length) {
        console.log(`Saving intermediate results after processing ${i + batchSize} work items...`);
        const dataDir = path.join(__dirname, '..', 'public', 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const outputFile = path.join(dataDir, 'ado-data.json');
        fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
      }
    }
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write data to file
    const outputFile = path.join(dataDir, 'ado-data.json');
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    
    console.log(`Data fetch complete. Results saved to ${outputFile}`);
    console.log(`Found: ${data.workItems.length} work items, ${data.pullRequests.length} pull requests, ${data.builds.length} builds`);
    
  } catch (error) {
    console.error('Error fetching data:', error);
    useSampleData();
    process.exit(1);
  }
}

// Function to fetch PR details via REST API
async function fetchPullRequestViaREST(prId, relationUrl, workItemId, data) {
  try {
    // Use organization from config
    const orgUrl = `https://dev.azure.com/${config.organization}`;
    const basicAuth = Buffer.from(`:${config.pat}`).toString('base64');
    
    // Use REST API to get PR details without needing project/repo information
    const url = `${orgUrl}/_apis/git/pullrequests/${prId}?api-version=7.0`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data) {
      const pr = response.data;
      
      // Extract repository information
      const repository = pr.repository || {};
      const project = repository.project || {};
      
      // Get project and repository names for better URLs
      const projectName = project.name || '';
      const repoName = repository.name || '';
      
      // Add PR to data if not already present
      if (!data.pullRequests.some(p => p.id === pr.pullRequestId)) {
        data.pullRequests.push({
          id: pr.pullRequestId,
          title: pr.title || 'Unknown Title',
          description: pr.description || '',
          status: pr.status || 'unknown',
          creationDate: pr.creationDate || new Date().toISOString(),
          createdBy: pr.createdBy?.displayName || 'Unknown',
          sourceBranch: pr.sourceRefName ? pr.sourceRefName.replace('refs/heads/', '') : 'unknown',
          targetBranch: pr.targetRefName ? pr.targetRefName.replace('refs/heads/', '') : 'unknown',
          isApproved: pr.reviewers?.some(r => r.vote === 10) || false,
          url: relationUrl,
          relatedWorkItems: [workItemId],
          // Add project and repository information
          projectName: projectName,
          repositoryName: repoName
        });
      } else {
        // Update existing PR
        const existingPR = data.pullRequests.find(p => p.id === pr.pullRequestId);
        if (!existingPR.relatedWorkItems.includes(workItemId)) {
          existingPR.relatedWorkItems.push(workItemId);
        }
        // Also update project/repo info if not present
        if (!existingPR.projectName || !existingPR.repositoryName) {
          existingPR.projectName = projectName;
          existingPR.repositoryName = repoName;
        }
      }
      return true;
    } else {
      console.warn(`REST API returned status ${response.status} for PR ${prId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error fetching PR ${prId} via REST API:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return false;
  }
}

// Function to fetch build details via REST API
async function fetchBuildViaREST(buildId, projectName, relationUrl, workItemId, data) {
  try {
    // Use organization from config
    const orgUrl = `https://dev.azure.com/${config.organization}`;
    const basicAuth = Buffer.from(`:${config.pat}`).toString('base64');
    
    // Try several possible projects to locate the build
    // If projectName is null, only try the common projects
    const projectsToTry = projectName ? 
      [projectName, 'EU-Change%20Governance'] : 
      ['EU-Change%20Governance', 'Build', 'UCD'];
    
    let build = null;
    let actualProjectName = null;
    let url = '';
    
    for (const proj of projectsToTry) {
      // Use the URL format provided by the user
      url = `${orgUrl}/${proj}/_apis/build/builds/?deletedFilter=1&buildIds=${buildId}&api-version=6.0`;
      
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200 && response.data && response.data.value && response.data.value.length > 0) {
          build = response.data.value[0];
          actualProjectName = proj;
          break;
        }
      } catch (err) {
        // Continue to try the next project
      }
    }
    
    if (build) {
      // Extract the true project name from the build data if available
      let trueProjectName = null;
      
      if (build.project && build.project.name) {
        trueProjectName = build.project.name;
      } else {
        // Fall back to the project name we used to find the build
        trueProjectName = actualProjectName?.replace('%20', ' ') || 'Unknown';
      }
      
      // Generate a browser-accessible URL with the correct project name
      const browserUrl = `https://dev.azure.com/${config.organization}/${encodeURIComponent(trueProjectName)}/_build/results?buildId=${build.id}`;
      
      // Check if build already exists in our collection
      if (!data.builds.some(b => b.id === build.id)) {
        // Add build data
        data.builds.push({
          id: build.id,
          buildNumber: build.buildNumber || 'Unknown',
          status: build.status || 'unknown',
          result: build.result || 'unknown',
          startTime: build.startTime || new Date().toISOString(),
          finishTime: build.finishTime || new Date().toISOString(),
          definition: {
            id: build.definition?.id || 0,
            name: build.definition?.name || 'Unknown'
          },
          repository: {
            id: build.repository?.id || 'unknown',
            name: build.repository?.name || 'Unknown'
          },
          project: trueProjectName,
          url: browserUrl,
          originalUrl: relationUrl,
          relatedWorkItems: [workItemId]
        });
      } else {
        // Update existing build to add the work item relationship
        const existingBuild = data.builds.find(b => b.id === build.id);
        if (!existingBuild.relatedWorkItems.includes(workItemId)) {
          existingBuild.relatedWorkItems.push(workItemId);
        }
      }
      return true;
    } else {
      console.warn(`Build ${buildId} was not found via REST API`);
      return false;
    }
  } catch (error) {
    console.error(`Error fetching build ${buildId} via REST API:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return false;
  }
}

// Run the main function
fetchData().catch(error => {
  console.log(error);
  console.error('Fatal error:', error);
  useSampleData();
  process.exit(1);
});