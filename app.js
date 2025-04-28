// Vue.js Application
const { createApp, ref, onMounted } = Vue;

const app = createApp({
    setup() {
        // State
        const deploymentData = ref(null);
        const activeTab = ref('pull-requests');
        const showModal = ref(false);
        const selectedItem = ref(null);
        const selectedItemType = ref(null);
        const errorMessage = ref('');
        
        // Computed properties
        const pullRequests = ref([]);
        const builds = ref([]);
        const workItems = ref([]);
        
        // Tabs configuration
        const tabs = [
            { id: 'pull-requests', name: 'Pull Requests' },
            { id: 'builds', name: 'Builds' },
            { id: 'work-items', name: 'Work Items' }
        ];
        
        // Methods
        const loadDeploymentData = async () => {
            try {
                // Try to fetch the JSON file
                const response = await fetch('deployment-summary.json');
                const data = await response.json();
                deploymentData.value = data;
                
                // Initialize data
                pullRequests.value = data['Pull Requests'] || [];
                builds.value = data['Builds'] || [];
                workItems.value = data['Work Items'] || [];
                
                errorMessage.value = '';
            } catch (error) {
                console.error('Error loading deployment data:', error);
                errorMessage.value = 'Error loading data. Please make sure you are running this application from a web server.';
                
                // Fallback: Try to load sample data if available
                try {
                    const sampleData = {
                        'Pull Requests': [
                            {
                                'Pull Request ID': '12345',
                                'Title': 'Sample Pull Request',
                                'Target Branch': 'main',
                                'Source Branch': 'feature/sample',
                                'Status': 'Active',
                                'Created By': 'Sample User',
                                'Creation Date': '2023-01-01',
                                'Linked Work Items': '12345 - Sample Work Item'
                            }
                        ],
                        'Builds': [
                            {
                                'Build ID': '67890',
                                'Build Number': '2023.1.1',
                                'Title': 'Sample Build',
                                'Status': 'Completed',
                                'Result': 'Succeeded',
                                'Requested By': 'Sample User',
                                'Start Time': '2023-01-01T12:00:00Z',
                                'Linked Work Items': '12345 - Sample Work Item'
                            }
                        ],
                        'Work Items': [
                            {
                                'id': '12345',
                                'title': 'Sample Work Item',
                                'state': 'Ready for Implementation',
                                'linked_items': [
                                    {
                                        'type': 'Pull Request',
                                        'title': 'Sample Pull Request',
                                        'url': '#'
                                    },
                                    {
                                        'type': 'Build',
                                        'title': 'Sample Build',
                                        'url': '#'
                                    }
                                ]
                            }
                        ]
                    };
                    
                    deploymentData.value = sampleData;
                    pullRequests.value = sampleData['Pull Requests'];
                    builds.value = sampleData['Builds'];
                    workItems.value = sampleData['Work Items'];
                    
                    errorMessage.value = 'Using sample data. Please run this application from a web server to load your actual data.';
                } catch (fallbackError) {
                    console.error('Error loading fallback data:', fallbackError);
                    errorMessage.value = 'Could not load data. Please make sure you are running this application from a web server.';
                }
            }
        };
        
        const showDetails = (type, item) => {
            selectedItemType.value = type;
            selectedItem.value = item;
            showModal.value = true;
        };
        
        const showWorkItemDetails = (workItem) => {
            selectedItemType.value = 'work-item';
            selectedItem.value = workItem;
            showModal.value = true;
        };
        
        const closeModal = () => {
            showModal.value = false;
            selectedItem.value = null;
            selectedItemType.value = null;
        };
        
        // Lifecycle hooks
        onMounted(() => {
            loadDeploymentData();
        });
        
        return {
            // State
            activeTab,
            showModal,
            selectedItem,
            selectedItemType,
            errorMessage,
            
            // Data
            pullRequests,
            builds,
            workItems,
            
            // Configuration
            tabs,
            
            // Methods
            showDetails,
            showWorkItemDetails,
            closeModal
        };
    }
});

// Mount the application
app.mount('#app'); 