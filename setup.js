const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Create necessary directories
console.log('Creating necessary directories...');
const publicDataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
  console.log('✅ Created public/data directory');
}

// Setup environment file
console.log('\nSetting up environment...');
rl.question('Enter your Azure DevOps organization name: ', (orgName) => {
  rl.question('Enter your Azure DevOps Personal Access Token (PAT): ', (pat) => {
    // Create .env file
    const envContent = `ADO_PAT=${pat}\nADO_ORG=${orgName}`;
    fs.writeFileSync(path.join(__dirname, '.env'), envContent);
    console.log('✅ Created .env file with your PAT');
    
    // Update the organization name in the fetchData.js script
    const fetchDataPath = path.join(__dirname, 'scripts', 'fetchData.js');
    if (fs.existsSync(fetchDataPath)) {
      let fetchData = fs.readFileSync(fetchDataPath, 'utf8');
      fetchData = fetchData.replace(/organization: '.*?'/, `organization: '${orgName}'`);
      fs.writeFileSync(fetchDataPath, fetchData);
      console.log('✅ Updated organization name in scripts/fetchData.js');
    }
    
    console.log('\n🚀 Setup complete! You can now run:');
    console.log('  npm install       - to install dependencies');
    console.log('  npm run fetch-data - to fetch data from Azure DevOps');
    console.log('  npm run dev        - to start the development server');
    
    rl.close();
  });
});

rl.on('close', () => {
  process.exit(0);
}); 