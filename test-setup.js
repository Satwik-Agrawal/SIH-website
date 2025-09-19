// Test script to verify the setup
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Societal Issue Reporting System Setup...\n');

// Check if required files exist
const requiredFiles = [
  'server.js',
  'package.json',
  'api-client.js',
  'index.html',
  'login.html',
  'signup.html',
  'report.html',
  'profile.html',
  'help.html',
  'admin_dashboard.html',
  'admin/admin_login.html'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check if uploads directory exists
if (!fs.existsSync('uploads')) {
  console.log('📁 Creating uploads directory...');
  fs.mkdirSync('uploads');
  console.log('✅ uploads/ directory created');
} else {
  console.log('✅ uploads/ directory exists');
}

// Check package.json dependencies
console.log('\n📦 Checking dependencies...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = [
    'express',
    'sqlite3',
    'multer',
    'bcryptjs',
    'jsonwebtoken',
    'cors',
    'body-parser',
    'express-session',
    'connect-sqlite3'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('❌ Error reading package.json');
  allFilesExist = false;
}

console.log('\n🎯 Setup Summary:');
if (allFilesExist) {
  console.log('✅ All required files and dependencies are present!');
  console.log('🚀 You can now run: npm start');
  console.log('🌐 Then visit: http://localhost:3000');
} else {
  console.log('❌ Some files or dependencies are missing.');
  console.log('🔧 Please run: npm install');
}

console.log('\n📋 Quick Start Guide:');
console.log('1. Run: npm install');
console.log('2. Run: npm start');
console.log('3. Open: http://localhost:3000');
console.log('4. Admin login: admin@sih.com / admin123');
console.log('\n🎉 Happy coding!');
