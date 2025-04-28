// Vue.js Application
const { createApp, ref, onMounted, computed } = Vue;

const app = createApp({
    setup() {
        // State
        const deploymentData = ref(null);
        const activeTab = ref('pull-requests');
        const showModal = ref(false);
        const selectedItem = ref(null);
        const selectedItemType = ref(null);
        const errorMessage = ref('');
        const selectedBranchFilters = ref(['all']);
        const customBranchFilter = ref('');
        const showCustomFilterInput = ref(false);
        const isLoading = ref(true);
        
        // Bootstrap modal instance
        let detailsModal = null;
        
        // Computed properties
        const pullRequests = ref([]);
        const builds = ref([]);
        const workItems = ref([]);
        
        // Branch filter options
        const branchFilters = [
            { id: 'all', name: 'All Branches' },
            { id: 'ucd/prod', name: 'ucd/prod' },
            { id: 'ucdweb/prod', name: 'ucdweb/prod' },
            { id: 'main', name: 'main' },
            { id: 'prod', name: 'prod' },
            { id: 'master', name: 'master' },
            { id: 'ucdapi/prod', name: 'ucdapi/prod' }
        ];
        
        // Filtered pull requests based on selected branches
        const filteredPullRequests = computed(() => {
            // If 'all' is selected, return all pull requests
            if (selectedBranchFilters.value.includes('all')) {
                return pullRequests.value;
            }
            
            // If no filters are selected, return all pull requests
            if (selectedBranchFilters.value.length === 0) {
                return pullRequests.value;
            }
            
            // Filter pull requests based on selected branches
            return pullRequests.value.filter(pr => {
                const targetBranch = pr['Target Branch'];
                if (!targetBranch) return false;
                
                // Check if the target branch matches any of the selected filters
                return selectedBranchFilters.value.some(filter => 
                    targetBranch.includes(filter)
                );
            });
        });
        
        // Tabs configuration
        const tabs = [
            { id: 'pull-requests', name: 'Pull Requests' },
            { id: 'builds', name: 'Builds' },
            { id: 'work-items', name: 'Work Items' }
        ];
        
        // Methods
        const loadDeploymentData = async () => {
            isLoading.value = true;
            errorMessage.value = '';
            
            try {
                // Try to fetch the JSON file
                const response = await fetch('deployment-summary.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                // Validate the data structure
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid data format');
                }
                
                deploymentData.value = data;
                
                // Initialize data with proper error handling
                pullRequests.value = Array.isArray(data['Pull Requests']) ? data['Pull Requests'] : [];
                builds.value = Array.isArray(data['Builds']) ? data['Builds'] : [];
                
                // Process work items data with proper error handling
                if (data['Work Items']) {
                    if (Array.isArray(data['Work Items'])) {
                        workItems.value = data['Work Items'];
                    } else if (data['Work Items'].work_items && Array.isArray(data['Work Items'].work_items)) {
                        workItems.value = data['Work Items'].work_items;
                    } else {
                        workItems.value = [];
                    }
                } else {
                    workItems.value = [];
                }
                
                console.log('Data loaded successfully:', {
                    pullRequests: pullRequests.value.length,
                    builds: builds.value.length,
                    workItems: workItems.value.length
                });
                
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
                                'Target Branch': 'refs/heads/main',
                                'Source Branch': 'feature/sample',
                                'Status': 'Active',
                                'Created By': 'Sample User',
                                'Creation Date': '2023-01-01',
                                'Reviewers': 'John Doe (Approved); Jane Smith (Approved with suggestions)',
                                'URL': 'https://dev.azure.com/sample/project/_git/repo/pullrequest/12345',
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
                                'URL': 'https://dev.azure.com/sample/project/_build/results?buildId=67890',
                                'Linked Work Items': '12345 - Sample Work Item'
                            }
                        ],
                        'Work Items': [
                            {
                                'id': '12345',
                                'title': 'Sample Work Item',
                                'state': 'Ready for Implementation',
                                'createdBy': 'Sample User',
                                'createdDate': '2023-01-01T10:00:00Z',
                                'url': 'https://dev.azure.com/sample/project/_workitems/edit/12345',
                                'comments': [
                                    {
                                        'id': 1,
                                        'text': 'This is a sample comment',
                                        'createdBy': 'John Doe',
                                        'createdDate': '2023-01-02T14:30:00Z'
                                    }
                                ],
                                'linked_items': [
                                    {
                                        'type': 'Pull Request',
                                        'title': 'Sample Pull Request',
                                        'url': 'https://dev.azure.com/sample/project/_git/repo/pullrequest/12345'
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
            } finally {
                isLoading.value = false;
            }
        };
        
        const showDetails = (type, item) => {
            selectedItemType.value = type;
            selectedItem.value = item;
            showModal.value = true;
            
            // Show the Bootstrap modal
            if (detailsModal) {
                detailsModal.show();
            }
        };
        
        const showWorkItemDetails = (workItem) => {
            selectedItemType.value = 'work-item';
            selectedItem.value = workItem;
            showModal.value = true;
            
            // Show the Bootstrap modal
            if (detailsModal) {
                detailsModal.show();
            }
        };
        
        const closeModal = () => {
            showModal.value = false;
            selectedItem.value = null;
            selectedItemType.value = null;
            
            // Hide the Bootstrap modal
            if (detailsModal) {
                detailsModal.hide();
            }
            
            // Clean up any lingering modal backdrops
            const modalBackdrop = document.querySelector('.modal-backdrop');
            if (modalBackdrop) {
                modalBackdrop.remove();
            }
            
            // Remove modal-open class from body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        };
        
        const toggleBranchFilter = (branch) => {
            // If 'all' is selected, deselect all other filters
            if (branch === 'all') {
                selectedBranchFilters.value = ['all'];
                return;
            }
            
            // If another filter is selected, remove 'all'
            if (selectedBranchFilters.value.includes('all')) {
                selectedBranchFilters.value = selectedBranchFilters.value.filter(b => b !== 'all');
            }
            
            // Toggle the selected filter
            const index = selectedBranchFilters.value.indexOf(branch);
            if (index === -1) {
                selectedBranchFilters.value.push(branch);
            } else {
                selectedBranchFilters.value.splice(index, 1);
            }
            
            // If no filters are selected, select 'all'
            if (selectedBranchFilters.value.length === 0) {
                selectedBranchFilters.value = ['all'];
            }
        };
        
        const addCustomFilter = () => {
            if (customBranchFilter.value.trim() === '') return;
            
            // Remove 'all' if it's selected
            if (selectedBranchFilters.value.includes('all')) {
                selectedBranchFilters.value = selectedBranchFilters.value.filter(b => b !== 'all');
            }
            
            // Add the custom filter
            if (!selectedBranchFilters.value.includes(customBranchFilter.value)) {
                selectedBranchFilters.value.push(customBranchFilter.value);
            }
            
            // Reset the custom filter input
            customBranchFilter.value = '';
            showCustomFilterInput.value = false;
        };
        
        const removeCustomFilter = (filter) => {
            const index = selectedBranchFilters.value.indexOf(filter);
            if (index !== -1) {
                selectedBranchFilters.value.splice(index, 1);
            }
            
            // If no filters are selected, select 'all'
            if (selectedBranchFilters.value.length === 0) {
                selectedBranchFilters.value = ['all'];
            }
        };
        
        // Format date for display
        const formatDate = (dateString) => {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    return dateString; // Return the original string if it's not a valid date
                }
                return date.toLocaleString();
            } catch (error) {
                console.error('Error formatting date:', error);
                return dateString; // Return the original string if there's an error
            }
        };
        
        // Lifecycle hooks
        onMounted(() => {
            // Initialize Bootstrap modal
            const modalElement = document.getElementById('detailsModal');
            if (modalElement) {
                detailsModal = new bootstrap.Modal(modalElement, {
                    backdrop: 'static', // Prevent closing when clicking outside
                    keyboard: true // Allow closing with keyboard
                });
                
                // Add event listener for when the modal is hidden
                modalElement.addEventListener('hidden.bs.modal', () => {
                    closeModal();
                });
                
                // Add event listener for when the modal is shown
                modalElement.addEventListener('shown.bs.modal', () => {
                    // Ensure the modal is properly displayed
                    document.body.classList.add('modal-open');
                });
            }
            
            // Load the data
            loadDeploymentData();
            
            // Clean up any lingering modal backdrops
            const cleanupModals = () => {
                const modalBackdrop = document.querySelector('.modal-backdrop');
                if (modalBackdrop) {
                    modalBackdrop.remove();
                }
                
                if (document.body.classList.contains('modal-open')) {
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';
                }
            };
            
            // Run cleanup on page load
            cleanupModals();
            
            // Also run cleanup when the page is unloaded
            window.addEventListener('beforeunload', cleanupModals);
            
            // Add a click event listener to the document to handle modal backdrop clicks
            document.addEventListener('click', (event) => {
                // Check if the click is on a modal backdrop
                if (event.target.classList.contains('modal-backdrop')) {
                    // Close the modal
                    closeModal();
                }
            });
        });
        
        return {
            // State
            activeTab,
            showModal,
            selectedItem,
            selectedItemType,
            errorMessage,
            selectedBranchFilters,
            customBranchFilter,
            showCustomFilterInput,
            isLoading,
            
            // Data
            deploymentData,
            pullRequests,
            builds,
            workItems,
            filteredPullRequests,
            
            // Configuration
            tabs,
            branchFilters,
            
            // Methods
            showDetails,
            showWorkItemDetails,
            closeModal,
            toggleBranchFilter,
            addCustomFilter,
            removeCustomFilter,
            formatDate
        };
    }
});

// Mount the application
app.mount('#app'); 