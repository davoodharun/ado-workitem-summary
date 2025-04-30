import { useState, useEffect } from 'react'
import { 
  Box, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel, 
  Heading, 
  Container,
  Flex
} from '@chakra-ui/react'
import WorkItemsTab from '../components/WorkItemsTab'
import PullRequestsTab from '../components/PullRequestsTab'
import BuildsTab from '../components/BuildsTab'
import ColorModeToggle from '../components/ColorModeToggle'

export default function Home() {
  const [data, setData] = useState({ workItems: [], pullRequests: [], builds: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/data/ado-data.json')
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`)
        }
        
        const jsonData = await response.json()
        setData(jsonData)
        setIsLoading(false)
      } catch (err) {
        console.error('Error loading data:', err)
        setError(err.message)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  if (isLoading) return <Container centerContent p={5}><Heading>Loading...</Heading></Container>
  if (error) return <Container centerContent p={5}><Heading color="red.500">Error: {error}</Heading></Container>

  return (
    <Container maxW="container.xl" p={5}>
      <Flex justifyContent="space-between" alignItems="center" mb={10}>
        <Heading as="h1" size="xl">Azure DevOps Deployment Summary</Heading>
        <ColorModeToggle />
      </Flex>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab _selected={{ bg: 'blue.600', color: 'white' }}>Work Items</Tab>
          <Tab _selected={{ bg: 'blue.600', color: 'white' }}>Pull Requests</Tab>
          <Tab _selected={{ bg: 'blue.600', color: 'white' }}>Builds</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <WorkItemsTab 
              workItems={data.workItems} 
              pullRequests={data.pullRequests}
              builds={data.builds}
            />
          </TabPanel>
          <TabPanel>
            <PullRequestsTab 
              pullRequests={data.pullRequests} 
              workItems={data.workItems} 
            />
          </TabPanel>
          <TabPanel>
            <BuildsTab builds={data.builds} workItems={data.workItems} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  )
} 