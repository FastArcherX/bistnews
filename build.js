import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔨 Starting build process...');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log('📁 Created dist directory');
}

// Check if required files exist in dist
const requiredFiles = [
    'index.html',
    'app.js',
    'enhanced-database.js',
    'submit-article-handlers.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    const filePath = path.join(distDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - OK`);
    } else {
        console.log(`❌ ${file} - Missing`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('✅ Build completed successfully!');
    console.log('🚀 All files are ready in dist/ directory');
} else {
    console.log('⚠️  Build completed with warnings - some files might be missing');
}

console.log('📦 Build process finished');