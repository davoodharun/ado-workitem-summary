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
        
        # Get pull request reviewers (approvals)
        $reviewersUrl = "$OrganizationUrl/_apis/git/repositories/$RepositoryId/pullrequests/$PullRequestId/reviewers?api-version=6.0"
        $reviewers = Invoke-RestMethod -Uri $reviewersUrl -Method Get -Headers $headers
        
        # Add reviewers to the pull request object
        $pullRequest | Add-Member -NotePropertyName 'reviewers' -NotePropertyValue $reviewers.value
        
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

# Function to get work item details including creator and discussions
function Get-WorkItemDetails {
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
    
    # Get work item details with expanded fields
    $workItemUrl = "$OrganizationUrl/$ProjectName/_apis/wit/workitems/$WorkItemId`?`$expand=all&api-version=6.0"
    
    try {
        $workItem = Invoke-RestMethod -Uri $workItemUrl -Method Get -Headers $headers
        
        # Get work item comments/discussions
        $commentsUrl = "$OrganizationUrl/$ProjectName/_apis/wit/workitems/$WorkItemId/comments?api-version=6.0"
        $comments = Invoke-RestMethod -Uri $commentsUrl -Method Get -Headers $headers
        
        # Add comments to the work item object
        $workItem | Add-Member -NotePropertyName 'comments' -NotePropertyValue $comments.value
        
        return $workItem
    }
    catch {
        if ($Debug) {
            Write-Host "Error getting work item details: $_"
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
                        reviewers = $pullRequestDetails.reviewers
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
SELECT [System.Id], [System.Title], [System.State], [System.CreatedBy], [System.CreatedDate]
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
    $workItemsUrl = "$OrganizationUrl/$ProjectName/_apis/wit/workitems?ids=$workItemIds&fields=System.Id,System.Title,System.State,System.CreatedBy,System.CreatedDate&api-version=6.0"
    $workItems = Invoke-RestMethod -Uri $workItemsUrl -Method Get -Headers $headers
    
    # Get additional details for each work item
    $detailedWorkItems = @()
    foreach ($workItem in $workItems.value) {
        $detailedWorkItem = Get-WorkItemDetails -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $ProjectName -WorkItemId $workItem.id
        if ($detailedWorkItem) {
            $detailedWorkItems += $detailedWorkItem
        } else {
            $detailedWorkItems += $workItem
        }
    }
    
    return $detailedWorkItems
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
                
                # Include all pull requests and builds without filtering by target branch
                $linkedItems += @{
                    url = $result.url
                    type = $result.type
                    title = $relation.attributes.name
                    details = $result.details
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
    
    # Create dictionaries to store unique pull requests and builds
    $uniquePullRequests = @{}
    $uniqueBuilds = @{}
    
    # Process all work items and their linked items
    foreach ($workItem in $Summary.work_items) {
        $workItemId = $workItem.id
        $workItemTitle = $workItem.title
        
        foreach ($linkedItem in $workItem.linked_items) {
            $linkedItemType = $linkedItem.type
            
            if ($linkedItemType -eq "Pull Request") {
                # Extract pull request details
                $pullRequestId = $linkedItem.url -replace '.*/pullrequest/(\d+)$', '$1'
                $pullRequestTitle = $linkedItem.title
                $targetBranch = $linkedItem.details.targetRefName
                $sourceBranch = $linkedItem.details.sourceRefName
                $status = $linkedItem.details.status
                $createdBy = $linkedItem.details.createdBy
                $creationDate = $linkedItem.details.creationDate
                $reviewers = $linkedItem.details.reviewers
                
                # Create a unique key for the pull request
                $key = "PR-$pullRequestId"
                
                # Add or update the pull request in the dictionary
                if (-not $uniquePullRequests.ContainsKey($key)) {
                    $uniquePullRequests[$key] = @{
                        'Pull Request ID' = $pullRequestId
                        'Title' = $pullRequestTitle
                        'Target Branch' = $targetBranch
                        'Source Branch' = $sourceBranch
                        'Status' = $status
                        'Created By' = $createdBy
                        'Creation Date' = $creationDate
                        'Reviewers' = $reviewers
                        'Linked Work Items' = @()
                    }
                }
                
                # Add the work item to the list of linked work items
                $uniquePullRequests[$key]['Linked Work Items'] += "$workItemId - $workItemTitle"
            }
            elseif ($linkedItemType -eq "Build") {
                # Extract build details
                $buildId = $linkedItem.url -replace '.*buildId=(\d+)', '$1'
                $buildTitle = $linkedItem.title
                $buildNumber = $linkedItem.details.buildNumber
                $status = $linkedItem.details.status
                $result = $linkedItem.details.result
                $requestedBy = $linkedItem.details.requestedBy
                $startTime = $linkedItem.details.startTime
                
                # Create a unique key for the build
                $key = "Build-$buildId"
                
                # Add or update the build in the dictionary
                if (-not $uniqueBuilds.ContainsKey($key)) {
                    $uniqueBuilds[$key] = @{
                        'Build ID' = $buildId
                        'Build Number' = $buildNumber
                        'Title' = $buildTitle
                        'Status' = $status
                        'Result' = $result
                        'Requested By' = $requestedBy
                        'Start Time' = $startTime
                        'Linked Work Items' = @()
                    }
                }
                
                # Add the work item to the list of linked work items
                $uniqueBuilds[$key]['Linked Work Items'] += "$workItemId - $workItemTitle"
            }
        }
    }
    
    # Convert the dictionaries to arrays of PSCustomObjects
    $pullRequestTable = @()
    foreach ($key in $uniquePullRequests.Keys) {
        $pr = $uniquePullRequests[$key]
        $linkedWorkItems = $pr['Linked Work Items'] -join "; "
        
        # Format reviewers
        $reviewersList = @()
        if ($pr['Reviewers']) {
            foreach ($reviewer in $pr['Reviewers']) {
                $vote = $reviewer.vote
                $voteText = switch ($vote) {
                    10 { "Approved" }
                    5 { "Approved with suggestions" }
                    0 { "No vote" }
                    -5 { "Waiting on author" }
                    -10 { "Rejected" }
                    default { "No vote" }
                }
                $reviewersList += "$($reviewer.displayName) ($voteText)"
            }
        }
        $reviewersText = $reviewersList -join "; "
        
        $pullRequestTable += [PSCustomObject]@{
            'Pull Request ID' = $pr['Pull Request ID']
            'Title' = if ($pr['Title'].Length -gt 50) { $pr['Title'].Substring(0, 47) + "..." } else { $pr['Title'] }
            'Target Branch' = $pr['Target Branch']
            'Source Branch' = $pr['Source Branch']
            'Status' = $pr['Status']
            'Created By' = $pr['Created By']
            'Creation Date' = $pr['Creation Date']
            'Reviewers' = if ($reviewersText.Length -gt 50) { $reviewersText.Substring(0, 47) + "..." } else { $reviewersText }
            'Linked Work Items' = if ($linkedWorkItems.Length -gt 50) { $linkedWorkItems.Substring(0, 47) + "..." } else { $linkedWorkItems }
        }
    }
    
    $buildTable = @()
    foreach ($key in $uniqueBuilds.Keys) {
        $build = $uniqueBuilds[$key]
        $linkedWorkItems = $build['Linked Work Items'] -join "; "
        
        $buildTable += [PSCustomObject]@{
            'Build ID' = $build['Build ID']
            'Build Number' = $build['Build Number']
            'Title' = if ($build['Title'].Length -gt 50) { $build['Title'].Substring(0, 47) + "..." } else { $build['Title'] }
            'Status' = $build['Status']
            'Result' = $build['Result']
            'Requested By' = $build['Requested By']
            'Start Time' = $build['Start Time']
            'Linked Work Items' = if ($linkedWorkItems.Length -gt 50) { $linkedWorkItems.Substring(0, 47) + "..." } else { $linkedWorkItems }
        }
    }
    
    return @{
        'Pull Requests' = $pullRequestTable
        'Builds' = $buildTable
    }
}

# Main execution
try {
    $summary = Get-DeploymentSummary -OrganizationUrl $OrganizationUrl -PersonalAccessToken $PersonalAccessToken -ProjectName $ProjectName
    
    # Output the summary as tables
    $tables = Format-SummaryAsTable -Summary $summary
    
    Write-Host "`nPull Requests:"
    $tables['Pull Requests'] | Format-Table -AutoSize
    
    Write-Host "`nBuilds:"
    $tables['Builds'] | Format-Table -AutoSize
    
    # Save the summary as JSON for the web app
    $jsonOutput = @{
        'Pull Requests' = $tables['Pull Requests']
        'Builds' = $tables['Builds']
        'Work Items' = $summary.work_items
    }
    
    $jsonOutput | ConvertTo-Json -Depth 10 | Out-File -FilePath "deployment-summary.json" -Encoding UTF8
    Write-Host "`nJSON summary saved to deployment-summary.json"
}
catch {
    Write-Error "An error occurred: $_"
} 
