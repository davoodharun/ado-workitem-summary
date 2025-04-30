import { useState } from 'react'
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Heading,
  Link,
  Badge,
  Select,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Text,
  Flex,
  Tag,
  TagLabel,
  Checkbox,
  Stack,
  CheckboxGroup,
  HStack,
  VStack,
  Wrap,
  WrapItem,
  Progress,
  Tooltip,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatGroup
} from '@chakra-ui/react'
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons'

export default function PullRequestsTab({ pullRequests, workItems }) {
  const [selectedPR, setSelectedPR] = useState(null)
  // Default target branch filters
  const defaultBranches = ['main', 'ucd/prod', 'ucdweb/prod', 'ucdapi/prod', 'master']
  const [targetBranchFilters, setTargetBranchFilters] = useState(defaultBranches)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'descending'
  });
  
  // Get unique target branches
  const targetBranches = [...new Set(pullRequests.map(pr => pr.targetBranch))]
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Convert status code to human readable format
  const getPRStatusText = (statusCode) => {
    const statusMap = {
      1: 'Active',
      2: 'Abandoned',
      3: 'Completed',
      4: 'Draft'
    }
    return statusMap[statusCode] || `Status ${statusCode}`
  }
  
  // Get status badge color
  const getStatusColor = (statusCode) => {
    const colorMap = {
      1: 'blue',    // Active
      2: 'red',     // Abandoned
      3: 'green',   // Completed
      4: 'gray'     // Draft
    }
    return colorMap[statusCode] || 'orange'
  }
  
  // Handle branch filter changes
  const handleBranchFilterChange = (branch) => {
    setTargetBranchFilters(prev => {
      // If branch is already selected, remove it
      if (prev.includes(branch)) {
        return prev.filter(b => b !== branch);
      } 
      // Otherwise add it
      return [...prev, branch];
    });
  }
  
  // Clear all filters
  const clearFilters = () => {
    setTargetBranchFilters([]);
  }
  
  // Filter pull requests by target branch - include PRs that match any selected branch
  const filteredPRs = targetBranchFilters.length > 0 ? 
    pullRequests.filter(pr => targetBranchFilters.includes(pr.targetBranch)) : 
    pullRequests;
  
  // Calculate approval stats
  const approvedCount = filteredPRs.filter(pr => pr.isApproved).length;
  const totalCount = filteredPRs.length;
  const approvalPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  
  // Handle sort request
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sort indicator icon
  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) return null;
    
    return sortConfig.direction === 'ascending' 
      ? <TriangleUpIcon ml={1} aria-label="sorted ascending" /> 
      : <TriangleDownIcon ml={1} aria-label="sorted descending" />;
  };

  // Sort items based on current sort configuration
  const sortedPRs = [...filteredPRs].sort((a, b) => {
    // Handle different data types for different columns
    let aValue, bValue;
    
    switch (sortConfig.key) {
      case 'id':
        aValue = parseInt(a.id);
        bValue = parseInt(b.id);
        break;
      case 'title':
        aValue = a.title?.toLowerCase() || '';
        bValue = b.title?.toLowerCase() || '';
        break;
      case 'projectName':
        aValue = a.projectName?.toLowerCase() || '';
        bValue = b.projectName?.toLowerCase() || '';
        break;
      case 'repositoryName':
        aValue = a.repositoryName?.toLowerCase() || '';
        bValue = b.repositoryName?.toLowerCase() || '';
        break;
      case 'creationDate':
        aValue = new Date(a.creationDate).getTime();
        bValue = new Date(b.creationDate).getTime();
        break;
      case 'createdBy':
        aValue = a.createdBy?.toLowerCase() || '';
        bValue = b.createdBy?.toLowerCase() || '';
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'isApproved':
        aValue = a.isApproved ? 1 : 0;
        bValue = b.isApproved ? 1 : 0;
        break;
      default:
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
    }
    
    // Compare values based on direction
    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });
  
  // Convert vsts URL to browser-accessible URL
  const getBrowserUrl = (vstsUrl) => {
    if (!vstsUrl) return '#';
    
    // Handle vstfs URLs (format: vstfs:///Git/PullRequestId/guid%2Fguid%2FprId)
    if (vstsUrl.startsWith('vstfs:///Git/PullRequestId/')) {
      try {
        // Extract the PR ID
        const parts = vstsUrl.split('%2F');
        if (parts.length > 0) {
          const prId = parts[parts.length - 1]; // Last part contains PR ID
          
          // For vstfs URLs, we don't have project/repo names available directly
          // We need to use a different approach - check if the PR info is in our data
          // If not, we'll use a modified format that will redirect correctly in ADO
          
          // Default organization
          const orgName = 'exelontfs';
          
          // Since we don't have project and repo names, we'll use a different format
          // ADO will redirect to the correct PR page even with just the PR ID
          return `https://dev.azure.com/${orgName}/_git/pullrequest/${prId}`;
          
          // Note: A better approach would be to store project/repo names when fetching PR data
          // Then you could look up by PR ID here to get the full info
        }
      } catch (e) {
        console.error('Error parsing vstfs URL:', e);
      }
      
      // Fallback - just use the PR ID if we can extract it
      const prIdMatch = vstsUrl.match(/(\d+)$/);
      if (prIdMatch) {
        const prId = prIdMatch[1];
        return `https://dev.azure.com/exelontfs/_git/pullrequest/${prId}`;
      }
      
      return '#'; // Return a placeholder if we can't parse
    }
    
    // Handle standard vsts URLs
    if (vstsUrl.startsWith('vsts://')) {
      try {
        // Extract components from the URL
        const parts = vstsUrl.split('/');
        
        // The format is usually vsts://organization/project/repo/pullrequest/id
        const organization = parts[2] || 'exelontfs';
        const project = parts[3] || '';
        const repo = parts[4] || '';
        const id = parts[parts.length - 1];
        
        // Generate a browser-accessible URL
        if (project && repo) {
          return `https://dev.azure.com/${organization}/${project}/_git/${repo}/pullrequest/${id}`;
        } else {
          // Fallback if we don't have project/repo
          return `https://dev.azure.com/${organization}/_git/pullrequest/${id}`;
        }
      } catch (e) {
        console.error('Error parsing vsts URL:', e);
        return '#';
      }
    }
    
    // If it's already a browser URL, return it as is
    if (vstsUrl.startsWith('http')) {
      return vstsUrl;
    }
    
    // Default fallback
    return `https://dev.azure.com/exelontfs/_git/pullrequest/${vstsUrl.split('/').pop()}`;
  }
  
  // Open PR details modal
  const handleOpenPRDetails = (pr) => {
    setSelectedPR(pr)
    onOpen()
  }
  
  // Add a function to get the proper URL using stored project and repository names
  const getProperPRUrl = (pr) => {
    if (!pr) return '#';
    
    const orgName = 'exelontfs';
    
    // If we have project and repository names, use them
    if (pr.projectName && pr.repositoryName) {
      return `https://dev.azure.com/${orgName}/${pr.projectName}/_git/${pr.repositoryName}/pullrequest/${pr.id}`;
    }
    
    // Otherwise fall back to the generic URL converter
    return getBrowserUrl(pr.url);
  }
  
  return (
    <Box>
      <Heading as="h2" size="md" mb={4}>Pull Requests ({filteredPRs.length})</Heading>
      
      {/* Approval Progress Bar */}
      <Box mb={6} borderWidth="1px" borderRadius="lg" p={4} bg="gray.700" shadow="md">
        <Flex direction={{ base: "column", md: "row" }} align="center" justify="space-between" mb={2}>
          <Text fontWeight="medium">Pull Request Approval Status:</Text>
          <Text fontWeight="bold">{approvedCount} of {totalCount} approved ({approvalPercent}%)</Text>
        </Flex>
        <Tooltip label={`${approvalPercent}% of pull requests are approved`} placement="top">
          <Progress 
            value={approvalPercent} 
            size="lg" 
            colorScheme={approvalPercent > 75 ? "green" : approvalPercent > 50 ? "blue" : approvalPercent > 25 ? "yellow" : "red"}
            borderRadius="md"
            hasStripe={true}
          />
        </Tooltip>
        <Flex justify="space-between" mt={1}>
          <Text fontSize="xs">0%</Text>
          <Text fontSize="xs">50%</Text>
          <Text fontSize="xs">100%</Text>
        </Flex>
      </Box>
      
      <Box mb={4}>
        <Flex direction="column" gap={2}>
          <Text fontWeight="medium">Filter by target branch:</Text>
          <Wrap spacing={2} mb={2}>
            {defaultBranches
              .filter(branch => targetBranches.includes(branch))
              .map(branch => (
                <WrapItem key={branch}>
                  <Checkbox 
                    isChecked={targetBranchFilters.includes(branch)}
                    onChange={() => handleBranchFilterChange(branch)}
                    colorScheme="green"
                  >
                    {branch}
                  </Checkbox>
                </WrapItem>
              ))}
            {targetBranches
              .filter(branch => !defaultBranches.includes(branch))
              .map(branch => (
                <WrapItem key={branch}>
                  <Checkbox 
                    isChecked={targetBranchFilters.includes(branch)}
                    onChange={() => handleBranchFilterChange(branch)}
                  >
                    {branch}
                  </Checkbox>
                </WrapItem>
              ))}
          </Wrap>
          {targetBranchFilters.length > 0 && (
            <Button size="sm" variant="outline" onClick={clearFilters} width="fit-content">
              Clear filters ({targetBranchFilters.length})
            </Button>
          )}
        </Flex>
      </Box>
      
      <Table variant="simple" colorScheme="gray">
        <Thead>
          <Tr>
            <Th cursor="pointer" onClick={() => requestSort('id')}>
              ID {getSortIcon('id')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('title')}>
              Title {getSortIcon('title')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('projectName')}>
              Project {getSortIcon('projectName')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('repositoryName')}>
              Repository {getSortIcon('repositoryName')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('creationDate')}>
              Created Date {getSortIcon('creationDate')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('createdBy')}>
              Created By {getSortIcon('createdBy')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('status')}>
              Status {getSortIcon('status')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('isApproved')}>
              Approved {getSortIcon('isApproved')}
            </Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sortedPRs.length > 0 ? (
            sortedPRs.map(pr => (
              <Tr key={pr.id}>
                <Td>
                  <Link href={getProperPRUrl(pr)} isExternal color="blue.500">
                    {pr.id}
                  </Link>
                </Td>
                <Td>{pr.title}</Td>
                <Td>{pr.projectName || '-'}</Td>
                <Td>{pr.repositoryName || '-'}</Td>
                <Td>{formatDate(pr.creationDate)}</Td>
                <Td>{pr.createdBy}</Td>
                <Td>
                  <Badge colorScheme={getStatusColor(pr.status)}>
                    {getPRStatusText(pr.status)}
                  </Badge>
                </Td>
                <Td>{pr.isApproved ? 'Yes' : 'No'}</Td>
                <Td>
                  <Button size="sm" colorScheme="blue" onClick={() => handleOpenPRDetails(pr)}>
                    Details
                  </Button>
                </Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={9} textAlign="center">No pull requests found</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
      
      {/* PR Details Modal */}
      {selectedPR && (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="gray.800" color="white">
            <ModalHeader borderBottomWidth="1px" borderColor="gray.600">Pull Request Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Heading size="md">{selectedPR.title}</Heading>
              <Text mt={2} color="gray.400">PR #{selectedPR.id}</Text>
              
              <Box mt={4}>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Created by:</Text>
                  <Text>{selectedPR.createdBy}</Text>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Created on:</Text>
                  <Text>{formatDate(selectedPR.creationDate)}</Text>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Status:</Text>
                  <Badge colorScheme={getStatusColor(selectedPR.status)}>
                    {getPRStatusText(selectedPR.status)}
                  </Badge>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Project:</Text>
                  <Text>{selectedPR.projectName || 'Unknown'}</Text>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Repository:</Text>
                  <Text>{selectedPR.repositoryName || 'Unknown'}</Text>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Source Branch:</Text>
                  <Text>{selectedPR.sourceBranch}</Text>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Target Branch:</Text>
                  <Text>{selectedPR.targetBranch}</Text>
                </Flex>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Approved:</Text>
                  <Text>{selectedPR.isApproved ? 'Yes' : 'No'}</Text>
                </Flex>
                
                {selectedPR.description && (
                  <Box mt={4}>
                    <Text fontWeight="bold" mb={2}>Description:</Text>
                    <Box p={2} bg="gray.700" borderRadius="md">
                      <Text whiteSpace="pre-wrap">{selectedPR.description}</Text>
                    </Box>
                  </Box>
                )}
                
                {selectedPR.relatedWorkItems && selectedPR.relatedWorkItems.length > 0 && (
                  <Box mt={4}>
                    <Text fontWeight="bold" mb={2}>Related Work Items:</Text>
                    <Flex wrap="wrap" gap={2}>
                      {selectedPR.relatedWorkItems.map(workItemId => {
                        const workItem = workItems.find(wi => wi.id === workItemId)
                        return (
                          <Tag key={workItemId} colorScheme="blue" size="md">
                            <TagLabel>
                              <Link href={`https://dev.azure.com/organization/EU-Change%20Governance/_workitems/edit/${workItemId}`} isExternal>
                                #{workItemId} {workItem ? workItem.title : ''}
                              </Link>
                            </TagLabel>
                          </Tag>
                        )
                      })}
                    </Flex>
                  </Box>
                )}
              </Box>
            </ModalBody>
            
            <ModalFooter borderTopWidth="1px" borderColor="gray.600">
              <Link 
                href={getProperPRUrl(selectedPR)} 
                isExternal 
                mr={3}
              >
                <Button colorScheme="blue">View in Azure DevOps</Button>
              </Link>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Box>
  )
} 