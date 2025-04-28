# Azure DevOps Deployment Summary Generator
# This script analyzes Azure DevOps work items and generates a summary of Change Request work items
# that are in "Ready for Implementation" state, along with their linked Pull Requests and Build Pipeline references.

param (
    [Parameter(Mandatory=$true)]
    [string]$OrganizationUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$PersonalAccessToken,
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "EU-Change Governance",
    
    [Parameter(Mandatory=$false)]
    [switch]$Debug
)

# Function to extract project information from vstfs URL
function Get-ProjectFromVstfsUrl {
    param (
        [string]$VstfsUrl,
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken
    )
    
    # Extract collection and project IDs from vstfs:// URL
    if ($VstfsUrl -match 'vstfs:///(\w+)/(\w+)/(\d+)/(\d+)') {
        $collectionId = $matches[1]
        $projectId = $matches[2]
        
        # Get project information from Azure DevOps API
        $headers = @{
            'Authorization' = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PersonalAccessToken")))"
            'Content-Type' = 'application/json'
        }
        
        try {
            $projectUrl = "$OrganizationUrl/_apis/projects/$projectId?api-version=6.0"
            $projectInfo = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers
            return $projectInfo.name
        }
        catch {
            if ($Debug) {
                Write-Host "Could not get project information for ID $projectId: $_"
            }
            return $null
        }
    }
    
    return $null
}

# Function to convert vstfs:// URLs to browser-friendly URLs
function Convert-ToBrowserUrl {
    param (
        [string]$VstfsUrl,
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken,
        [string]$DefaultProjectName
    )
    
    if ($Debug) {
        Write-Host "Converting URL: $VstfsUrl"
    }
    
    # Try to get the project name from the URL
    $projectName = Get-ProjectFromVstfsUrl -VstfsUrl $VstfsUrl -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken
    
    # If we couldn't get the project name, use the default
    if (-not $projectName) {
        $projectName = $DefaultProjectName
        if ($Debug) {
            Write-Host "Using default project name: $projectName"
        }
    }
    else {
        if ($Debug) {
            Write-Host "Found project name: $projectName"
        }
    }
    
    # Extract repository and pull request IDs from vstfs:// URL
    if ($VstfsUrl -match 'vstfs:///Git/PullRequestId/(\d+)/(\d+)') {
        $repositoryId = $matches[1]
        $pullRequestId = $matches[2]
        
        # Construct browser-friendly URL
        $browserUrl = "$OrganizationUrl/$projectName/_git/_apis/git/repositories/$repositoryId/pullRequests/$pullRequestId"
        if ($Debug) {
            Write-Host "Converted to: $browserUrl"
        }
        return $browserUrl
    }
    elseif ($VstfsUrl -match 'vstfs:///Build/Build/(\d+)') {
        $buildId = $matches[1]
        
        # Construct browser-friendly URL for build
        $browserUrl = "$OrganizationUrl/$projectName/_build/results?buildId=$buildId"
        if ($Debug) {
            Write-Host "Converted to: $browserUrl"
        }
        return $browserUrl
    }
    elseif ($VstfsUrl -match 'vstfs:///Git/Ref/(\d+)/(\w+)') {
        $repositoryId = $matches[1]
        $refName = $matches[2]
        
        # Construct browser-friendly URL for branch reference
        $browserUrl = "$OrganizationUrl/$projectName/_git/_apis/git/repositories/$repositoryId/refs?filter=heads/$refName"
        if ($Debug) {
            Write-Host "Converted to: $browserUrl"
        }
        return $browserUrl
    }
    elseif ($VstfsUrl -match 'vstfs:///Git/Commit/(\d+)/(\w+)') {
        $repositoryId = $matches[1]
        $commitId = $matches[2]
        
        # Construct browser-friendly URL for commit
        $browserUrl = "$OrganizationUrl/$projectName/_git/_apis/git/repositories/$repositoryId/commits/$commitId"
        if ($Debug) {
            Write-Host "Converted to: $browserUrl"
        }
        return $browserUrl
    }
    else {
        # Try to extract any IDs from the URL that might be useful
        if ($VstfsUrl -match 'vstfs:///(\w+)/(\w+)/(\d+)') {
            $serviceType = $matches[1]
            $itemType = $matches[2]
            $itemId = $matches[3]
            
            # Construct a generic browser-friendly URL
            $browserUrl = "$OrganizationUrl/$projectName/_apis/$serviceType/$itemType/$itemId"
            if ($Debug) {
                Write-Host "Converted to generic URL: $browserUrl"
            }
            return $browserUrl
        }
        
        # Return original URL if it doesn't match expected patterns
        if ($Debug) {
            Write-Host "Could not convert URL, returning original"
        }
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
                $browserUrl = Convert-ToBrowserUrl -VstfsUrl $relation.url -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -DefaultProjectName $ProjectName
                
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