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
  Text,
  Icon
} from '@chakra-ui/react'
import { useState } from 'react'
import { TriangleDownIcon, TriangleUpIcon } from '@chakra-ui/icons'

export default function BuildsTab({ builds, workItems }) {
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'descending'
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

  // Sort builds based on current sort configuration
  const sortedBuilds = [...builds].sort((a, b) => {
    // Handle different data types for different columns
    let aValue, bValue;
    
    switch (sortConfig.key) {
      case 'id':
        aValue = parseInt(a.id);
        bValue = parseInt(b.id);
        break;
      case 'buildNumber':
        aValue = a.buildNumber || '';
        bValue = b.buildNumber || '';
        break;
      case 'definition':
        aValue = a.definition?.name?.toLowerCase() || '';
        bValue = b.definition?.name?.toLowerCase() || '';
        break;
      case 'startTime':
        aValue = new Date(a.startTime).getTime();
        bValue = new Date(b.startTime).getTime();
        break;
      case 'status':
        aValue = a.status?.toLowerCase() || '';
        bValue = b.status?.toLowerCase() || '';
        break;
      case 'result':
        aValue = a.result?.toLowerCase() || '';
        bValue = b.result?.toLowerCase() || '';
        break;
      case 'relatedItems':
        aValue = a.relatedWorkItems?.length || 0;
        bValue = b.relatedWorkItems?.length || 0;
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
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Convert vsts URL to browser-accessible URL
  const getBrowserUrl = (vstsUrl) => {
    if (!vstsUrl) return '#';
    
    // Handle vstfs URLs
    if (vstsUrl.startsWith('vstfs:///Build/Build/')) {
      try {
        // Extract build ID from URL
        const buildIdMatch = vstsUrl.match(/(\d+)$/);
        if (buildIdMatch) {
          const buildId = buildIdMatch[1];
          
          // Extract project info if available
          let projectName = null;
          const projectMatch = vstsUrl.match(/vstfs:\/\/\/Build\/Build\/([^\/]+)/);
          if (projectMatch && projectMatch[1]) {
            projectName = projectMatch[1];
          }
          
          // Default organization
          const orgName = 'exelontfs';
          
          if (projectName) {
            return `https://dev.azure.com/${orgName}/${projectName}/_build/results?buildId=${buildId}`;
          } else {
            return `https://dev.azure.com/${orgName}/_build/results?buildId=${buildId}`;
          }
        }
      } catch (e) {
        console.error('Error parsing vstfs build URL:', e);
      }
    }
    
    // Handle standard vsts URLs
    if (vstsUrl.startsWith('vsts://')) {
      try {
        const parts = vstsUrl.split('/');
        const buildId = parts[parts.length - 1];
        const organization = parts[2] || 'exelontfs';
        const project = parts[3] || '';
        
        if (project) {
          return `https://dev.azure.com/${organization}/${project}/_build/results?buildId=${buildId}`;
        } else {
          return `https://dev.azure.com/${organization}/_build/results?buildId=${buildId}`;
        }
      } catch (e) {
        console.error('Error parsing build URL:', e);
      }
    }
    
    // If it's already a browser URL, return it as is
    if (vstsUrl.startsWith('http')) {
      return vstsUrl;
    }
    
    // Extract build ID from URL and use default path
    const buildId = vstsUrl.split('/').pop();
    return `https://dev.azure.com/exelontfs/_build/results?buildId=${buildId}`;
  }
  
  // Get associated work item titles
  const getWorkItemTitles = (workItemIds) => {
    if (!workItemIds || !workItemIds.length) return 'None'
    
    return workItemIds.map(id => {
      const workItem = workItems.find(wi => wi.id === id)
      return workItem ? `#${id} - ${workItem.title}` : `#${id}`
    }).join(', ')
  }
  
  // Get color for build result
  const getResultColor = (result) => {
    switch (result?.toLowerCase()) {
      case 'succeeded':
        return 'green'
      case 'failed':
        return 'red'
      case 'canceled':
        return 'yellow'
      case 'inprogress':
        return 'blue'
      default:
        return 'gray'
    }
  }
  
  return (
    <Box>
      <Heading size="md" mb={4}>Linked Builds</Heading>
      
      {sortedBuilds.length > 0 ? (
        <Table variant="simple" colorScheme="gray">
          <Thead>
            <Tr>
              <Th cursor="pointer" onClick={() => requestSort('id')}>
                Build ID {getSortIcon('id')}
              </Th>
              <Th cursor="pointer" onClick={() => requestSort('buildNumber')}>
                Build Number {getSortIcon('buildNumber')}
              </Th>
              <Th cursor="pointer" onClick={() => requestSort('definition')}>
                Definition {getSortIcon('definition')}
              </Th>
              <Th cursor="pointer" onClick={() => requestSort('startTime')}>
                Started {getSortIcon('startTime')}
              </Th>
              <Th cursor="pointer" onClick={() => requestSort('status')}>
                Status {getSortIcon('status')}
              </Th>
              <Th cursor="pointer" onClick={() => requestSort('result')}>
                Result {getSortIcon('result')}
              </Th>
              <Th cursor="pointer" onClick={() => requestSort('relatedItems')}>
                Related Work Items {getSortIcon('relatedItems')}
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedBuilds.map(build => (
              <Tr key={build.id}>
                <Td>
                  <Link href={build.url} isExternal color="blue.500">
                    {build.id}
                  </Link>
                </Td>
                <Td>{build.buildNumber}</Td>
                <Td>{build.definition?.name || '-'}</Td>
                <Td>{formatDate(build.startTime)}</Td>
                <Td>{build.status}</Td>
                <Td>
                  <Badge colorScheme={getResultColor(build.result)}>
                    {build.result || 'Unknown'}
                  </Badge>
                </Td>
                <Td>
                  <Text noOfLines={1} title={getWorkItemTitles(build.relatedWorkItems)}>
                    {build.relatedWorkItems ? build.relatedWorkItems.length : 0} item(s)
                  </Text>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <Box textAlign="center" p={4}>
          <Text>No builds found</Text>
        </Box>
      )}
    </Box>
  )
} 