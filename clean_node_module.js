#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

/**
 * Recursively remove all `node_modules` directories within a given folder.
 * 
 * @param {string} folderPath - The path to start scanning for node_modules.
 */
async function removeNodeModules(folderPath) {
  let dirents;
  try {
    dirents = await fs.readdir(folderPath, { withFileTypes: true });
  } catch (err) {
    // If folderPath is not a directory or not accessible, just return
    return;
  }

  for (const dirent of dirents) {
    const fullPath = path.join(folderPath, dirent.name);

    if (dirent.isDirectory()) {
      // Check if the directory is named "node_modules"
      if (dirent.name === 'node_modules') {
        console.log(`Removing: ${fullPath}`);
        await fs.rm(fullPath, { recursive: true, force: true });
        console.log(`Removed: ${fullPath}`);
      } else {
        // Recursively check sub-directories
        await removeNodeModules(fullPath);
      }
    }
  }
}

// ------------------------------------------------------
// Main execution starts here
// ------------------------------------------------------
(async () => {
  const targetFolder = process.argv[2];

  if (!targetFolder) {
    console.error('Usage: node cleanup.js <pathToProjects>');
    process.exit(1);
  }

  try {
    const absolutePath = path.resolve(targetFolder);
    console.log(`Starting cleanup in: ${absolutePath}`);
    await removeNodeModules(absolutePath);
    console.log('Cleanup complete!');
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
})();
