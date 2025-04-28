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

# Function to get pull request details
function Get-PullRequestDetails {
    param (
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken,
        [string]$ProjectName,
        [string]$RepositoryId,
        [string]$PullRequestId
    )
    
    $headers = @{
        'Authorization' = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PersonalAccessToken")))"
        'Content-Type' = 'application/json'
    }
    
    # Use the simplified API endpoint format as per Microsoft documentation
    $pullRequestUrl = "$OrganizationUrl/_apis/git/pullrequests/$PullRequestId`?api-version=6.0"
    
    try {
        $pullRequest = Invoke-RestMethod -Uri $pullRequestUrl -Method Get -Headers $headers
        return $pullRequest
    }
    catch {
        if ($Debug) {
            Write-Host "Error getting pull request details: $_"
        }
        return $null
    }
}

# Function to get build details
function Get-BuildDetails {
    param (
        [string]$OrganizationUrl,
        [string]$PersonalAccessToken,
        [string]$ProjectName,
        [string]$BuildId
    )
    
    $headers = @{
        'Authorization' = "Basic $([Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$PersonalAccessToken")))"
        'Content-Type' = 'application/json'
    }
    
    $buildUrl = "$OrganizationUrl/$ProjectName/_apis/build/builds/$BuildId`?api-version=6.0"
    
    try {
        $build = Invoke-RestMethod -Uri $buildUrl -Method Get -Headers $headers
        return $build
    }
    catch {
        if ($Debug) {
            Write-Host "Error getting build details: $_"
        }
        return $null
    }
}

# Function to convert vstfs:// URLs to browser-friendly URLs and get additional details
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
    
    # Initialize variables
    $result = @{
        url = $VstfsUrl
        type = "Unknown"
    }
    
    # Extract IDs from vstfs:// URL based on different patterns
    $repositoryId = $null
    $pullRequestId = $null
    $buildId = $null
    $refName = $null
    $commitId = $null
    
    # Check for Pull Request URLs
    if ($VstfsUrl -match 'vstfs:///Git/PullRequestId/(\d+)/(\d+)') {
        $repositoryId = $matches[1]
        $pullRequestId = $matches[2]
        $result.type = "Pull Request"
    }
    elseif ($VstfsUrl -match 'vstfs:///Git/PullRequest/(\d+)/(\d+)') {
        $repositoryId = $matches[1]
        $pullRequestId = $matches[2]
        $result.type = "Pull Request"
    }
    elseif ($VstfsUrl -match 'vstfs:///Git/PullRequest/([^%]+)%2F([^%]+)%2F(\d+)') {
        $repositoryId = $matches[1]
        $projectId = $matches[2]
        $pullRequestId = $matches[3]
        $result.type = "Pull Request"
    }
    elseif ($VstfsUrl -match 'vstfs:///Git/PullRequest/([^%]+)%2F([^%]+)%2F([^%]+)%2F(\d+)') {
        $repositoryId = $matches[1]
        $projectId = $matches[2]
        $repositoryName = $matches[3]
        $pullRequestId = $matches[4]
        $result.type = "Pull Request"
    }
    elseif ($VstfsUrl -match 'vstfs:///Git/PullRequest') {
        # Split the URL by %2F and get the last part as the pull request ID
        $parts = $VstfsUrl -split '%2F'
        $pullRequestId = $parts[-1]
        
        # Extract repository ID from the URL
        if ($VstfsUrl -match 'vstfs:///Git/PullRequest/([^%]+)') {
            $repositoryId = $matches[1]
        } else {
            # If we can't extract the repository ID, we'll need to make an API call to get it
            # For now, we'll use a placeholder
            $repositoryId = "unknown"
        }
        $result.type = "Pull Request"
    }
    # Check for Build URLs
    elseif ($VstfsUrl -match 'vstfs:///Build/Build/(\d+)') {
        $buildId = $matches[1]
        $result.type = "Build"
    }
    # Check for Branch Reference URLs
    elseif ($VstfsUrl -match 'vstfs:///Git/Ref/(\d+)/(\w+)') {
        $repositoryId = $matches[1]
        $refName = $matches[2]
        $result.type = "Branch Reference"
    }
    # Check for Commit URLs
    elseif ($VstfsUrl -match 'vstfs:///Git/Commit/(\d+)/(\w+)') {
        $repositoryId = $matches[1]
        $commitId = $matches[2]
        $result.type = "Commit"
    }
    
    # Process based on the type
    switch ($result.type) {
        "Pull Request" {
            if ($pullRequestId) {
                # Get pull request details
                $pullRequestDetails = Get-PullRequestDetails -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $DefaultProjectName -RepositoryId $repositoryId -PullRequestId $pullRequestId
                
                # Use project name and repository ID from the pull request details if available
                $projectName = $DefaultProjectName
                $repoId = $repositoryId
                
                if ($pullRequestDetails -and $pullRequestDetails.repository) {
                    $projectName = $pullRequestDetails.repository.project.name
                    $repoId = $pullRequestDetails.repository.id
                }
                
                # Construct browser-friendly URL for pull request
                $result.url = "$OrganizationUrl/$projectName/_git/$repoId/pullrequest/$pullRequestId"
                
                # Add pull request details if available
                if ($pullRequestDetails) {
                    $result.details = @{
                        title = $pullRequestDetails.title
                        status = $pullRequestDetails.status
                        sourceRefName = $pullRequestDetails.sourceRefName
                        targetRefName = $pullRequestDetails.targetRefName
                        createdBy = $pullRequestDetails.createdBy.displayName
                        creationDate = $pullRequestDetails.creationDate
                    }
                }
            }
        }
        "Build" {
            if ($buildId) {
                # Get build details
                $buildDetails = Get-BuildDetails -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $DefaultProjectName -BuildId $buildId
                
                # Construct browser-friendly URL for build
                $result.url = "$OrganizationUrl/$DefaultProjectName/_build/results?buildId=$buildId"
                
                # Add build details if available
                if ($buildDetails) {
                    $result.details = @{
                        buildNumber = $buildDetails.buildNumber
                        status = $buildDetails.status
                        result = $buildDetails.result
                        startTime = $buildDetails.startTime
                        finishTime = $buildDetails.finishTime
                        requestedBy = $buildDetails.requestedBy.displayName
                    }
                }
            }
        }
        "Branch Reference" {
            if ($repositoryId -and $refName) {
                # Construct browser-friendly URL for branch reference
                $result.url = "$OrganizationUrl/$DefaultProjectName/_git/_apis/git/repositories/$repositoryId/refs?filter=heads/$refName"
            }
        }
        "Commit" {
            if ($repositoryId -and $commitId) {
                # Construct browser-friendly URL for commit
                $result.url = "$OrganizationUrl/$DefaultProjectName/_git/_apis/git/repositories/$repositoryId/commits/$commitId"
            }
        }
    }
    
    if ($Debug) {
        Write-Host "Converted to: $($result.url)"
    }
    
    return $result
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
                
                # Convert vstfs:// URL to browser-friendly URL and get details
                $result = Convert-ToBrowserUrl -VstfsUrl $relation.url -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -DefaultProjectName $ProjectName
                
                # For pull requests, check if the target branch is one of the specified branches
                $includeItem = $true
                if ($result.type -eq "Pull Request" -and $result.details) {
                    $targetBranch = $result.details.targetRefName
                    $includeItem = $false
                    
                    # Check if the target branch is one of the specified branches
                    if ($targetBranch -match 'refs/heads/ucdprod' -or 
                        $targetBranch -match 'refs/heads/ucd/prod' -or 
                        $targetBranch -match 'refs/heads/ucdweb/prod' -or 
                        $targetBranch -match 'refs/heads/master' -or 
                        $targetBranch -match 'refs/heads/main') {
                        $includeItem = $true
                    }
                }
                
                # Only include the item if it passes the filter
                if ($includeItem) {
                    $linkedItems += @{
                        url = $result.url
                        type = $result.type
                        title = $relation.attributes.name
                        details = $result.details
                    }
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

# Function to format the summary as a table
function Format-SummaryAsTable {
    param (
        [object]$Summary
    )
    
    $tableData = @()
    
    foreach ($workItem in $Summary.work_items) {
        $workItemId = $workItem.id
        # Truncate the title to 50 characters and add ellipsis if needed
        $workItemTitle = if ($workItem.title.Length -gt 50) {
            $workItem.title.Substring(0, 47) + "..."
        } else {
            $workItem.title
        }
        $workItemState = $workItem.state
        
        if ($workItem.linked_items.Count -eq 0) {
            # Add a row for work items with no linked items
            $tableData += [PSCustomObject]@{
                'Work Item ID' = $workItemId
                'Title' = $workItemTitle
                'State' = $workItemState
                'Linked Item Type' = 'None'
                'Linked Item Title' = ''
                'Linked Item URL' = ''
                'Target Branch' = ''
                'Status' = ''
                'Created By' = ''
                'Creation Date' = ''
            }
        }
        else {
            # Add a row for each linked item
            foreach ($linkedItem in $workItem.linked_items) {
                $linkedItemType = $linkedItem.type
                # Truncate the linked item title to 40 characters and add ellipsis if needed
                $linkedItemTitle = if ($linkedItem.title.Length -gt 40) {
                    $linkedItem.title.Substring(0, 37) + "..."
                } else {
                    $linkedItem.title
                }
                $linkedItemUrl = $linkedItem.url
                
                # Extract details based on the linked item type
                $targetBranch = ''
                $status = ''
                $createdBy = ''
                $creationDate = ''
                
                if ($linkedItem.details) {
                    if ($linkedItemType -eq 'Pull Request') {
                        $targetBranch = $linkedItem.details.targetRefName
                        $status = $linkedItem.details.status
                        $createdBy = $linkedItem.details.createdBy
                        $creationDate = $linkedItem.details.creationDate
                    }
                    elseif ($linkedItemType -eq 'Build') {
                        $status = $linkedItem.details.status
                        $createdBy = $linkedItem.details.requestedBy
                        $creationDate = $linkedItem.details.startTime
                    }
                }
                
                $tableData += [PSCustomObject]@{
                    'Work Item ID' = $workItemId
                    'Title' = $workItemTitle
                    'State' = $workItemState
                    'Linked Item Type' = $linkedItemType
                    'Linked Item Title' = $linkedItemTitle
                    'Linked Item URL' = $linkedItemUrl
                    'Target Branch' = $targetBranch
                    'Status' = $status
                    'Created By' = $createdBy
                    'Creation Date' = $creationDate
                }
            }
        }
    }
    
    return $tableData
}

# Main execution
try {
    $summary = Get-DeploymentSummary -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $ProjectName
    
    # Output the summary as a table
    $tableData = Format-SummaryAsTable -Summary $summary
    $tableData | Format-Table -AutoSize
    
    # Also output the summary as JSON for reference
    Write-Host "`nJSON Summary:"
    $summary | ConvertTo-Json -Depth 10
}
catch {
    Write-Error "An error occurred: $_"
} 
