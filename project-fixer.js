/**
 * V0 Project Fixer
 * 
 * This script fixes common issues with v0.dev projects:
 * 1. Dependency conflicts (date-fns and react-day-picker)
 * 2. Node.js version detection issues
 * 3. React hydration errors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('V0 Project Fixer');
console.log('---------------');
console.log(`Current Node.js: ${process.version} at ${process.execPath}`);
console.log(`Working directory: ${process.cwd()}`);

// Fix #1: Create .npmrc with legacy-peer-deps=true
console.log('\n🔧 Fixing dependency issues...');
fs.writeFileSync(path.join(process.cwd(), '.npmrc'), 'legacy-peer-deps=true\n');
console.log('✅ Created .npmrc with legacy-peer-deps=true');

// Fix #2: Update package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Add engines field to specify Node.js version
    packageJson.engines = packageJson.engines || {};
    packageJson.engines.node = '>=20.0.0';
    console.log('✅ Added Node.js version requirement to package.json');
    
    // Fix date-fns version if needed
    if (packageJson.dependencies && packageJson.dependencies['date-fns'] && 
        packageJson.dependencies['react-day-picker']) {
      const dateFnsVersion = packageJson.dependencies['date-fns'];
      if (dateFnsVersion.startsWith('4')) {
        console.log('✅ Fixing date-fns version compatibility with react-day-picker...');
        packageJson.dependencies['date-fns'] = '^3.0.0';
      }
    }
    
    // Create a new dev script that uses the current Node.js executable explicitly
    packageJson.scripts = packageJson.scripts || {};
    
    // Save the original dev script
    if (packageJson.scripts.dev && !packageJson.scripts.original_dev) {
      packageJson.scripts.original_dev = packageJson.scripts.dev;
    }
    
    // Create a new dev script with explicit Node path
    const currentNodePath = process.execPath.replace(/\\/g, '\\\\'); // Escape backslashes for Windows
    packageJson.scripts.dev = `cross-env NODE_NO_WARNINGS=1 "${currentNodePath}" ./node_modules/next/dist/bin/next dev`;
    console.log('✅ Updated npm scripts to use the correct Node.js executable');
    
    // Add cross-env as a dev dependency if not already present
    packageJson.devDependencies = packageJson.devDependencies || {};
    if (!packageJson.devDependencies['cross-env']) {
      packageJson.devDependencies['cross-env'] = '^7.0.3';
    }
    
    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Install cross-env
    console.log('Installing cross-env...');
    execSync('npm install --save-dev cross-env', { stdio: 'inherit' });
  } catch (error) {
    console.error(`⚠️ Error updating package.json: ${error.message}`);
  }
} else {
  console.error('⚠️ package.json not found');
}

// Fix #3: Create .nvmrc and .env files
console.log('\n🔧 Creating helper files...');
fs.writeFileSync(path.join(process.cwd(), '.nvmrc'), '20\n');
console.log('✅ Created .nvmrc file with Node version 20');

const envContent = `# Force Next.js to use the correct Node.js version
NODE_VERSION=${process.version.slice(1)}
NEXT_TELEMETRY_DISABLED=1
`;
fs.writeFileSync('.env', envContent);
console.log('✅ Created .env file with NODE_VERSION setting');

// Fix #4: Fix hydration errors by updating layout files
console.log('\n🔧 Fixing React hydration errors...');

// Create providers.tsx
const appDir = path.join(process.cwd(), 'app');
if (fs.existsSync(appDir)) {
  const providersPath = path.join(appDir, 'providers.tsx');
  const providersContent = `'use client';

import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering children after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted yet, render a placeholder with the same structure
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}
`;

  fs.writeFileSync(providersPath, providersContent);
  console.log('✅ Created app/providers.tsx');

  // Update layout.tsx
  const layoutPath = path.join(appDir, 'layout.tsx');
  if (fs.existsSync(layoutPath)) {
    let layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    // Check if providers are already imported
    if (!layoutContent.includes("import { Providers }")) {
      // Add providers import
      layoutContent = layoutContent.replace(
        "import './globals.css'", 
        "import './globals.css'\nimport { Providers } from './providers'"
      );
    }
    
    // Add suppressHydrationWarning to html and body
    layoutContent = layoutContent.replace(
      /<html lang="en">/g, 
      '<html lang="en" suppressHydrationWarning>'
    );
    
    // Wrap children with Providers
    layoutContent = layoutContent.replace(
      /<body([^>]*)>(\s*){children}(\s*)<\/body>/g, 
      '<body$1 suppressHydrationWarning>\n        <Providers>{children}</Providers>\n      </body>'
    );
    
    fs.writeFileSync(layoutPath, layoutContent);
    console.log('✅ Updated app/layout.tsx');
  } else {
    console.log('⚠️ app/layout.tsx not found. Unable to update layout.');
  }
} else {
  console.log('⚠️ app directory not found. Skipping hydration fixes.');
}

// Create a launcher batch file
console.log('\n🔧 Creating launcher...');
const batchContent = `@echo off
echo Starting Next.js with Node.js ${process.version}...
npm run dev
pause
`;
fs.writeFileSync('start-v0-project.bat', batchContent);
console.log('✅ Created start-v0-project.bat launcher file');

// Final instructions
console.log('\n✨ V0 project fixes completed successfully! ✨');
console.log('\nTo run your project:');
console.log('1. Double-click start-v0-project.bat');
console.log('   OR');
console.log('2. Run: npm run dev');
console.log('\nTo fix other v0 projects:');
console.log('1. Copy this script to new v0 project folders');
console.log('2. Run: node v0-project-fixer.js'); 