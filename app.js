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
                const response = await fetch('deployment-summary.json');
                const data = await response.json();
                deploymentData.value = data;
                
                // Initialize data
                pullRequests.value = data['Pull Requests'] || [];
                builds.value = data['Builds'] || [];
                workItems.value = data['Work Items'] || [];
            } catch (error) {
                console.error('Error loading deployment data:', error);
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