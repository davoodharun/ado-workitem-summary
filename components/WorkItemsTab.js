import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Select,
  Heading,
  Link,
  Badge,
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
  Divider,
  Tag,
  TagLabel,
  Icon
} from '@chakra-ui/react'
import { useState } from 'react'
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons'

export default function WorkItemsTab({ workItems, pullRequests, builds }) {
  const [filterStatus, setFilterStatus] = useState('Implemented')
  const [selectedItem, setSelectedItem] = useState(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'descending'
  })
  
  const statuses = [...new Set(workItems.map(item => item.state))]
  
  // Apply filtering
  const filteredItems = filterStatus ? 
    workItems.filter(item => item.state === filterStatus) : 
    workItems

  // Sort items based on current sort configuration
  const sortedItems = [...filteredItems].sort((a, b) => {
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
      case 'state':
        aValue = a.state?.toLowerCase() || '';
        bValue = b.state?.toLowerCase() || '';
        break;
      case 'technicalLead':
        // Handle technical lead which might be an object
        aValue = typeof a.technicalLead === 'object' 
          ? (a.technicalLead?.displayName || '').toLowerCase() 
          : (a.technicalLead || '').toLowerCase();
        bValue = typeof b.technicalLead === 'object' 
          ? (b.technicalLead?.displayName || '').toLowerCase() 
          : (b.technicalLead || '').toLowerCase();
        break;
      case 'createdDate':
        aValue = new Date(a.createdDate).getTime();
        bValue = new Date(b.createdDate).getTime();
        break;
      case 'linkedItems':
        aValue = countLinkedItems(a);
        bValue = countLinkedItems(b);
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

  // Format date to be more readable
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Function to convert vsts URL to browser-accessible URL
  const getWorkItemUrl = (id) => {
    if (!id) return '#';
    
    // Use the organization in the URL
    const orgName = 'exelontfs'; // Update this to your organization name
    const project = 'EU-Change%20Governance'; // URL-encoded project name
    
    return `https://dev.azure.com/${orgName}/${project}/_workitems/edit/${id}`;
  }

  // Count only pull requests and builds in the relations
  const countLinkedItems = (workItem) => {
    if (!workItem.relations || !workItem.relations.length) return 0;
    
    let count = 0;
    
    for (const relation of workItem.relations) {
      // Count pull request relations
      const isPullRequest = 
        relation.url && (
          relation.url.includes('pullRequests') || 
          relation.url.includes('pullrequest') || 
          (relation.attributes && relation.attributes.name === 'Pull Request')
        );
        
      // Count build relations
      const isBuild = 
        relation.url && (
          relation.url.includes('/build/') || 
          relation.url.includes('/_build/') || 
          (relation.attributes && relation.attributes.name === 'Build')
        );
        
      if (isPullRequest || isBuild) {
        count++;
      }
    }
    
    return count;
  }
  
  // Get linked pull requests for a work item
  const getLinkedPullRequests = (workItemId) => {
    return pullRequests.filter(pr => pr.relatedWorkItems && pr.relatedWorkItems.includes(workItemId));
  }
  
  // Get linked builds for a work item
  const getLinkedBuilds = (workItemId) => {
    return builds.filter(build => build.relatedWorkItems && build.relatedWorkItems.includes(workItemId));
  }
  
  // Open work item details modal
  const handleOpenDetails = (item) => {
    setSelectedItem(item);
    onOpen();
  }
  
  return (
    <Box>
      <Heading size="md" mb={4}>Change Request Work Items</Heading>
      
      <Box mb={4}>
        <Select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          width="200px"
          variant="filled"
          bg="gray.700"
        >
          <option value="">All Statuses</option>
          {statuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
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
            <Th cursor="pointer" onClick={() => requestSort('state')}>
              Status {getSortIcon('state')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('technicalLead')}>
              Technical Lead {getSortIcon('technicalLead')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('createdDate')}>
              Created Date {getSortIcon('createdDate')}
            </Th>
            <Th cursor="pointer" onClick={() => requestSort('linkedItems')}>
              PR/Build Links {getSortIcon('linkedItems')}
            </Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sortedItems.length > 0 ? (
            sortedItems.map(item => (
              <Tr key={item.id}>
                <Td>
                  <Link href={getWorkItemUrl(item.id)} isExternal color="blue.500">
                    {item.id}
                  </Link>
                </Td>
                <Td>{item.title}</Td>
                <Td>
                  <Badge colorScheme={item.state === 'Implemented' ? 'green' : 'blue'}>
                    {item.state}
                  </Badge>
                </Td>
                <Td>
                  {item.technicalLead ? 
                    (typeof item.technicalLead === 'object' ? 
                      item.technicalLead.displayName || 'Unknown' : 
                      item.technicalLead) : 
                    'Not Assigned'}
                </Td>
                <Td>{formatDate(item.createdDate)}</Td>
                <Td>{countLinkedItems(item)}</Td>
                <Td>
                  <Button size="sm" colorScheme="blue" onClick={() => handleOpenDetails(item)}>
                    Details
                  </Button>
                </Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={7} textAlign="center">No work items found</Td>
            </Tr>
          )}
        </Tbody>
      </Table>
      
      {/* Work Item Details Modal */}
      {selectedItem && (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="gray.800" color="white">
            <ModalHeader borderBottomWidth="1px" borderColor="gray.600">Work Item Details</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Heading size="md">{selectedItem.title}</Heading>
              <Text mt={2} color="gray.400">ID: {selectedItem.id}</Text>
              
              <Box mt={6}>
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Status:</Text>
                  <Badge colorScheme={selectedItem.state === 'Implemented' ? 'green' : 'blue'}>
                    {selectedItem.state}
                  </Badge>
                </Flex>
                
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Technical Lead:</Text>
                  <Text>
                    {selectedItem.technicalLead ? 
                      (typeof selectedItem.technicalLead === 'object' ? 
                        selectedItem.technicalLead.displayName || 'Unknown' : 
                        selectedItem.technicalLead) : 
                      'Not Assigned'}
                  </Text>
                </Flex>
                
                <Flex justify="space-between" mb={2}>
                  <Text fontWeight="bold">Created Date:</Text>
                  <Text>{formatDate(selectedItem.createdDate)}</Text>
                </Flex>
                
                <Divider my={4} borderColor="gray.600" />
                
                {/* Linked Pull Requests */}
                <Box mt={4}>
                  <Text fontWeight="bold" mb={2}>Linked Pull Requests:</Text>
                  {getLinkedPullRequests(selectedItem.id).length > 0 ? (
                    <Table size="sm" variant="simple" colorScheme="gray">
                      <Thead>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Title</Th>
                          <Th>Status</Th>
                          <Th>Branch</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {getLinkedPullRequests(selectedItem.id).map(pr => (
                          <Tr key={pr.id}>
                            <Td>
                              <Link href={pr.url} isExternal color="blue.500">
                                {pr.id}
                              </Link>
                            </Td>
                            <Td>{pr.title}</Td>
                            <Td>
                              <Badge colorScheme={pr.status === 3 ? 'green' : pr.status === 1 ? 'blue' : 'gray'}>
                                {pr.status === 3 ? 'Completed' : pr.status === 1 ? 'Active' : pr.status}
                              </Badge>
                            </Td>
                            <Td>{pr.targetBranch}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text color="gray.400">No linked pull requests</Text>
                  )}
                </Box>
                
                {/* Linked Builds */}
                <Box mt={4}>
                  <Text fontWeight="bold" mb={2}>Linked Builds:</Text>
                  {getLinkedBuilds(selectedItem.id).length > 0 ? (
                    <Table size="sm" variant="simple" colorScheme="gray">
                      <Thead>
                        <Tr>
                          <Th>Build ID</Th>
                          <Th>Build Number</Th>
                          <Th>Status</Th>
                          <Th>Result</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {getLinkedBuilds(selectedItem.id).map(build => (
                          <Tr key={build.id}>
                            <Td>
                              <Link href={build.url} isExternal color="blue.500">
                                {build.id}
                              </Link>
                            </Td>
                            <Td>{build.buildNumber}</Td>
                            <Td>{build.status}</Td>
                            <Td>
                              <Badge 
                                colorScheme={
                                  build.result === 'succeeded' ? 'green' : 
                                  build.result === 'failed' ? 'red' : 
                                  build.result === 'canceled' ? 'yellow' : 'gray'
                                }
                              >
                                {build.result || 'Unknown'}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text color="gray.400">No linked builds</Text>
                  )}
                </Box>
              </Box>
            </ModalBody>
            
            <ModalFooter borderTopWidth="1px" borderColor="gray.600">
              <Link 
                href={getWorkItemUrl(selectedItem.id)} 
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