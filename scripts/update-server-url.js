#!/usr/bin/env node

/**
 * Script to update the default server URL in package.json
 * This ensures consistency between constants.ts and package.json
 * 
 * Usage: node scripts/update-server-url.js <new-server-url>
 * Example: node scripts/update-server-url.js https://api.tazapay.com
 */

const fs = require('fs');
const path = require('path');

// Get the new server URL from command line arguments
const newServerUrl = process.argv[2];

if (!newServerUrl) {
  console.error('Error: Please provide a server URL as an argument.');
  console.log('Usage: node scripts/update-server-url.js <new-server-url>');
  console.log('Example: node scripts/update-server-url.js https://api.tazapay.com');
  process.exit(1);
}

// Validate URL format
try {
  new URL(newServerUrl);
} catch (error) {
  console.error(`Error: Invalid URL format: ${newServerUrl}`);
  process.exit(1);
}

const projectRoot = path.join(__dirname, '..');

// Update constants.ts
const constantsPath = path.join(projectRoot, 'src', 'constants.ts');
let constantsContent = fs.readFileSync(constantsPath, 'utf8');
constantsContent = constantsContent.replace(
  /DEFAULT_SERVER_URL: '[^']*'/,
  `DEFAULT_SERVER_URL: '${newServerUrl}'`
);
fs.writeFileSync(constantsPath, constantsContent, 'utf8');

// Update package.json
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.contributes.configuration.properties['tazapay.serverUrl'].default = newServerUrl;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

console.log(`✅ Successfully updated server URL to: ${newServerUrl}`);
console.log('Updated files:');
console.log('  - src/constants.ts');
console.log('  - package.json');
console.log('\nDon\'t forget to run "npm run compile" to rebuild the extension.');