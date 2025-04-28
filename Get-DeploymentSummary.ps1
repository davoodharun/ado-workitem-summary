# Azure DevOps Deployment Summary Generator
# This script analyzes Azure DevOps work items and generates a summary of Change Request work items
# that are in "Ready for Implementation" state, along with their linked Pull Requests and Build Pipeline references.

param (
    [Parameter(Mandatory=$true)]
    [string]$OrganizationUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$PersonalAccessToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "EU-Change Governance"
)

# Function to convert vstfs:// URLs to browser-friendly URLs
function Convert-ToBrowserUrl {
    param (
        [string]$VstfsUrl,
        [string]$OrganizationUrl,
        [string]$ProjectName
    )
    
    # Extract repository and pull request IDs from vstfs:// URL
    if ($VstfsUrl -match 'vstfs:///Git/PullRequestId/(\d+)/(\d+)') {
        $repositoryId = $matches[1]
        $pullRequestId = $matches[2]
        
        # Construct browser-friendly URL
        return "$OrganizationUrl/$ProjectName/_git/_apis/git/repositories/$repositoryId/pullRequests/$pullRequestId"
    }
    elseif ($VstfsUrl -match 'vstfs:///Build/Build/(\d+)') {
        $buildId = $matches[1]
        
        # Construct browser-friendly URL for build
        return "$OrganizationUrl/$ProjectName/_build/results?buildId=$buildId"
    }
    else {
        # Return original URL if it doesn't match expected patterns
        return $VstfsUrl
    }
}

# Function to get work items in "Ready for Implementation" state
function Get-ReadyForImplementationItems {
    param (
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken,
        [string]$ProjectName
    )
    
    $headers = @{
        'Authorization' = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PersonalAccessToken")))"
        'Content-Type' = 'application/json'
    }
    
    $wiqlQuery = @{
        query = @"
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.WorkItemType] = 'Change Request'
AND [System.State] = 'Ready for Implementation'
AND [System.TeamProject] = '$ProjectName'
"@
    }
    
    $wiqlBody = $wiqlQuery | ConvertTo-Json
    
    $wiqlUrl = "$OrganizationUrl/$ProjectName/_apis/wit/wiql?api-version=6.0"
    $wiqlResponse = Invoke-RestMethod -Uri $wiqlUrl -Method Post -Headers $headers -Body $wiqlBody
    
    if ($wiqlResponse.workItems.Count -eq 0) {
        Write-Host "No work items found in 'Ready for Implementation' state."
        return @()
    }
    
    # Get detailed work item information
    $workItemIds = $wiqlResponse.workItems.id -join ','
    $workItemsUrl = "$OrganizationUrl/$ProjectName/_apis/wit/workitems?ids=$workItemIds&fields=System.Id,System.Title,System.State&api-version=6.0"
    $workItems = Invoke-RestMethod -Uri $workItemsUrl -Method Get -Headers $headers
    
    return $workItems.value
}

# Function to get linked items for a work item
function Get-LinkedItems {
    param (
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken,
        [string]$ProjectName,
        [int]$WorkItemId
    )
    
    $headers = @{
        'Authorization' = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PersonalAccessToken")))"
        'Content-Type' = 'application/json'
    }
    
    $workItemUrl = "$OrganizationUrl/$ProjectName/_apis/wit/workitems/$WorkItemId`?`$expand=relations&api-version=6.0"
    $workItem = Invoke-RestMethod -Uri $workItemUrl -Method Get -Headers $headers
    
    $linkedItems = @()
    
    if ($workItem.relations) {
        foreach ($relation in $workItem.relations) {
            $url = $relation.url.ToLower()
            
            # Check if it's a pull request or build pipeline reference
            if ($url -match 'pullrequest' -or 
                $url -match 'build' -or 
                $url -match 'stage to main' -or 
                $url -match 'ucdstage to ucdprod' -or 
                $url -match 'ucdweb/stage to ucdweb/prod') {
                
                # Convert vstfs:// URL to browser-friendly URL
                $browserUrl = Convert-ToBrowserUrl -VstfsUrl $relation.url -OrganizationUrl $OrganizationUrl -ProjectName $ProjectName
                
                $linkedItems += @{
                    url = $browserUrl
                    type = $relation.rel
                    title = $relation.attributes.name
                }
            }
        }
    }
    
    return $linkedItems
}

# Function to generate the summary
function Get-DeploymentSummary {
    param (
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken,
        [string]$ProjectName
    )
    
    $workItems = Get-ReadyForImplementationItems -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $ProjectName
    
    $summary = @{
        work_items = @()
    }
    
    foreach ($workItem in $workItems) {
        $linkedItems = Get-LinkedItems -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $ProjectName -WorkItemId $workItem.id
        
        $summary.work_items += @{
            id = $workItem.id
            title = $workItem.fields.'System.Title'
            state = $workItem.fields.'System.State'
            linked_items = $linkedItems
        }
    }
    
    return $summary
}

# Main execution
try {
    $summary = Get-DeploymentSummary -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $ProjectName
    
    # Output the summary as JSON
    $summary | ConvertTo-Json -Depth 10
}
catch {
    Write-Error "An error occurred: $_"
} 