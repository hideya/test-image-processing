// This is a helper script to add AWS SDK dependencies for R2 storage
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add AWS SDK dependencies if they don't exist
const dependenciesToAdd = {
  '@aws-sdk/client-s3': '^3.465.0'
};

// Add dependencies
for (const [dep, version] of Object.entries(dependenciesToAdd)) {
  if (!packageJson.dependencies[dep]) {
    packageJson.dependencies[dep] = version;
    console.log(`Added ${dep}@${version}`);
  } else {
    console.log(`${dep} already exists`);
  }
}

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('package.json updated successfully');
console.log('Run "npm install" to install the new dependencies');
