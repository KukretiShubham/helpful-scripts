#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * List of media file extensions to skip.
 * Add or remove extensions as you see fit.
 */
const mediaExtensions = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".mp3",
  ".mp4",
  ".mov",
  ".avi",
  ".mpeg",
  ".webm",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
];

/**
 * Checks if a filename ends with one of the media extensions we want to skip.
 *
 * @param {string} fileName
 * @returns {boolean} true if the file is recognized as media, false otherwise
 */
function isMediaFile(fileName) {
  const lowerName = fileName.toLowerCase();
  return mediaExtensions.some((ext) => lowerName.endsWith(ext));
}

/**
 * Generates a directory tree string (like a simplified `tree` command).
 * Skips hidden items, ignored directories, .md files, and known media files.
 *
 * @param {string} dir - The directory to generate a tree for.
 * @param {string} prefix - Prefix for the current level (used for indentation).
 * @param {string[]} ignoreDirs - List of directory names/files to ignore (like .git, node_modules).
 * @returns {string} The tree representation of the directory structure.
 */
function generateFolderTree(dir, prefix = "", ignoreDirs = []) {
  let treeString = "";

  // Read directory entries
  let entries = fs.readdirSync(dir, { withFileTypes: true });

  // Filter out hidden files/dirs, ignored entries, .md, and media files
  entries = entries.filter((entry) => {
    const { name } = entry;
    const lowerName = name.toLowerCase();

    // Skip hidden (starts with '.')
    if (name.startsWith(".")) return false;
    // Skip if it's in ignoreDirs array
    if (ignoreDirs.includes(name)) return false;
    // Skip markdown files (.md)
    if (!entry.isDirectory() && lowerName.endsWith(".md")) return false;
    // Skip media files
    if (!entry.isDirectory() && isMediaFile(name)) return false;

    return true;
  });

  // Sort folders first, then files for a tidier tree
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  // Build the tree structure
  entries.forEach((entry, index) => {
    const fullPath = path.join(dir, entry.name);
    const isLast = index === entries.length - 1;

    // Tree branch symbols
    const branch = isLast ? "└── " : "├── ";
    const spacer = isLast ? "    " : "│   ";

    // Add the current entry line
    treeString += prefix + branch + entry.name + "\n";

    // If directory, recurse
    if (entry.isDirectory()) {
      treeString += generateFolderTree(fullPath, prefix + spacer, ignoreDirs);
    }
  });

  return treeString;
}

/**
 * Recursively walk through the given directory, appending file paths and contents
 * to the output stream. Skips hidden files/dirs, ignored dirs, .md files, and media files.
 *
 * @param {string} dir - Directory to walk.
 * @param {string} rootDir - The top-level directory for relative paths.
 * @param {string} projectName - The project name prefix in output paths.
 * @param {fs.WriteStream} outputStream - Write stream to the output file.
 * @param {string[]} ignoreDirs - List of directory names/files to ignore.
 */
function walkDirectory(dir, rootDir, projectName, outputStream, ignoreDirs) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const { name } = entry;
    const lowerName = name.toLowerCase();
    const fullPath = path.join(dir, name);

    // 1) Skip hidden files/directories (start with ".")
    if (name.startsWith(".")) continue;

    // 2) Skip ignored directories/files
    if (ignoreDirs.includes(name)) continue;

    // 3) Skip markdown files
    if (!entry.isDirectory() && lowerName.endsWith(".md")) continue;

    // 4) Skip media files
    if (!entry.isDirectory() && isMediaFile(name)) continue;

    // If it's a directory, recurse deeper
    if (entry.isDirectory()) {
      walkDirectory(fullPath, rootDir, projectName, outputStream, ignoreDirs);
    } else {
      // It's a file -> record path and contents
      const relativePath = path.relative(rootDir, fullPath);
      outputStream.write(`${projectName}/${relativePath}\n\n`);

      try {
        const fileContent = fs.readFileSync(fullPath, "utf8");
        outputStream.write(fileContent);
      } catch (error) {
        outputStream.write(`[Error reading file: ${error.message}]`);
      }
      outputStream.write("\n\n"); // Extra blank line after each file
    }
  }
}

/**
 * Main function to combine codebase into a single text file,
 * including a folder tree at the top.
 *
 * @param {string} projectName - The project name prefix in output paths.
 * @param {string} rootDir - Root directory to start from.
 */
function combineCodebase(projectName, rootDir) {
  // Directories/files you want to ignore altogether
  const ignoreDirs = [
    ".git",
    "node_modules",
    "public",
    "scripts",
    ".env",
    "yarn.lock",
    "assets",
    "README.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "LICENSE.md",
    "yarn-error.log",
  ];

  const outputFile = `${projectName}_combined.txt`;
  const outputStream = fs.createWriteStream(outputFile, { encoding: "utf8" });

  // 1) Generate the tree view and write it at the top
  const treeString = generateFolderTree(rootDir, "", ignoreDirs);
  outputStream.write(`tree ${projectName}\n`);
  outputStream.write(treeString + "\n\n");

  // 2) Recursively walk through the directory, appending file paths/contents
  walkDirectory(rootDir, rootDir, projectName, outputStream, ignoreDirs);

  // 3) End the stream
  outputStream.end(() => {
    console.log(`Combined codebase written to: ${outputFile}`);
  });
}

// --------------------------------------------------------------------------
// If this file is run directly, parse CLI args and run the script
// --------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Usage: node combine_codebase.mjs <project_name> [root_directory]
  if (process.argv.length < 3) {
    console.log("Usage: node combine_codebase.mjs <project_name> [root_directory]");
    process.exit(1);
  }

  const projectName = process.argv[2];
  const rootDir = process.argv[3] || "."; // default to current directory if not specified

  combineCodebase(projectName, rootDir);
}

// Export if you want to import `combineCodebase` from another file
export { combineCodebase };
