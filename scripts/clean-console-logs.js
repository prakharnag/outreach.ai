#!/usr/bin/env node

/**
 * Production-ready console.log cleanup script
 * Removes debug console.log statements while preserving error logging
 */

const fs = require('fs');
const path = require('path');

// Files to process (relative to project root)
const filesToClean = [
  // Test files - reduce verbosity but keep structure
  'tests/setup/global-setup.ts',
  'tests/integration/userFlow.spec.ts',
  'tests/integration/api.spec.ts',
  'tests/integration/crossBrowser.spec.ts',
  'tests/integration/errorHandling.spec.ts',
  'tests/integration/regenerationFlow.spec.ts'
];

// Patterns to remove (console.log statements)
const patternsToRemove = [
  /^\s*console\.log\([^)]*\);\s*$/gm,
  /console\.log\([^)]*\);\s*/gm
];

// Patterns to keep (error logging)
const patternsToKeep = [
  /console\.error/,
  /console\.warn/,
  /console\.info/
];

function cleanFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;
    
    // Remove console.log patterns
    patternsToRemove.forEach(pattern => {
      content = content.replace(pattern, (match) => {
        // Check if this is an error/warn/info statement that should be kept
        const shouldKeep = patternsToKeep.some(keepPattern => keepPattern.test(match));
        if (shouldKeep) {
          return match; // Keep error logging
        }
        
        // For test files, replace with a minimal comment
        if (filePath.includes('test') || filePath.includes('spec')) {
          // Check if it's a test description log
          if (match.includes('🧪') || match.includes('✅') || match.includes('⚠️') || match.includes('🌐')) {
            return ''; // Remove test progress logs
          }
        }
        
        return ''; // Remove the console.log
      });
    });

    // Clean up multiple empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Cleaned: ${filePath}`);
      return true;
    } else {
      console.log(`📄 No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🧹 Starting production console.log cleanup...\n');
  
  let cleanedCount = 0;
  
  filesToClean.forEach(filePath => {
    if (cleanFile(filePath)) {
      cleanedCount++;
    }
  });
  
  console.log(`\n🎉 Cleanup complete! Processed ${filesToClean.length} files, cleaned ${cleanedCount} files.`);
  console.log('📋 Summary:');
  console.log('   ✅ Removed debug console.log statements');
  console.log('   ✅ Preserved console.error/warn/info statements');
  console.log('   ✅ Reduced test verbosity for production');
  console.log('\n🚀 Codebase is now production-ready!');
}

if (require.main === module) {
  main();
}

module.exports = { cleanFile };
