#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 
 * Max lines per output file.
 * Once we exceed this limit, we close the current output file and create a new one.
 */
let MAX_LINES_PER_FILE = 5000;

/**
 * Media file extensions you want to skip.
 */
const mediaExtensions = [
  ".png", ".jpg", ".jpeg", ".gif",
  ".mp3", ".mp4", ".mov", ".avi",
  ".mpeg", ".webm", ".webp", ".svg",
  ".ico", ".pdf",
];

/**
 * Determine if a given filename is a media file we want to skip.
 * @param {string} fileName
 * @returns {boolean}
 */
function isMediaFile(fileName) {
  const lowerName = fileName.toLowerCase();
  return mediaExtensions.some((ext) => lowerName.endsWith(ext));
}

/**
 * Checks if we should ignore this entry altogether (hidden files, directories, etc.).
 * Customize this logic as needed:
 *   - skip hidden files (start with '.')
 *   - skip .md
 *   - skip media (by extension)
 *   - skip certain directories
 * @param {string} name - entry name (file or directory)
 * @param {boolean} isDirectory
 * @param {string[]} ignoreList
 * @returns {boolean} true if it should be ignored
 */
function isIgnored(name, isDirectory, ignoreList) {
  if (name.startsWith(".")) return true; // skip hidden
  if (!isDirectory && name.toLowerCase().endsWith(".md")) return true; // skip .md
  if (!isDirectory && isMediaFile(name)) return true; // skip media
  if (ignoreList.includes(name)) return true; // skip anything in the explicit ignore list
  return false;
}

/**
 * Recursive function to walk the directory and gather all file paths
 * that are not ignored. Returns an array of absolute file paths.
 *
 * @param {string} dir - Directory to walk.
 * @param {string[]} ignoreList - items to ignore
 * @returns {string[]} all file paths that should be included
 */
function gatherFilePaths(dir, ignoreList = []) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const { name } = entry;
    const fullPath = path.join(dir, name);

    if (isIgnored(name, entry.isDirectory(), ignoreList)) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...gatherFilePaths(fullPath, ignoreList));
    } else {
      // It's a file => add to results
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Given a file path, returns an array of lines: 
 *   [ 'projectName/relative/path', '', 'file content line1', 'file content line2', ... ]
 * 
 * This way, we can count how many lines the entire "chunk" for a file takes,
 * including its header and blank lines.
 *
 * @param {string} filePath
 * @param {string} rootDir
 * @param {string} projectName
 * @returns {string[]} lines representing this file (including header, blank lines, etc.)
 */
function buildFileLines(filePath, rootDir, projectName) {
  // The header line: "projectName/relative/path"
  const relativePath = path.relative(rootDir, filePath);
  const headerLine = `${projectName}/${relativePath}`;

  // Read file content
  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    // If error, just embed an error message
    content = `[Error reading file: ${err.message}]`;
  }

  // Break content into lines
  const fileContentLines = content.split("\n");

  // Return the full array of lines we want to output
  // We'll add:
  //   1) header line
  //   2) blank line
  //   3) file content lines
  //   4) blank line
  // 
  // This means:
  //   lines = [
  //     "projectName/relativePath",
  //     "",
  //     "... file line 1 ...",
  //     "... file line 2 ...",
  //     ...
  //     "... file line n ...",
  //     ""
  //   ];
  return [headerLine, "", ...fileContentLines, ""];
}

/**
 * Generate an output filename with an index (e.g. myProject_combined_001.txt).
 * Adjust as you like to ensure proper zero-padding or naming scheme.
 *
 * @param {string} projectName
 * @param {number} index
 * @returns {string} e.g. "myProject_combined_001.txt"
 */
function getOutputFileName(projectName, index) {
  const padded = String(index).padStart(3, "0");
  return `${projectName}_combined_${padded}.txt`;
}

/**
 * Combine codebase into multiple output files, each with a maximum number of lines.
 *
 * @param {string} projectName - prefix for the output filenames
 * @param {string} rootDir - root directory to start from
 */
function combineCodebaseWithLineLimit(projectName, rootDir) {
  // 1) Gather all file paths (skip ignored)
  // Customize this list as needed
  const ignoreList = [
    ".git",
    "node_modules",
    "public",
    "scripts",
    ".env",
    "yarn.lock",
    "package-lock.json",
    "assets",
    "README.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "LICENSE.md",
    "bun.lockb",
  ];

  const filePaths = gatherFilePaths(rootDir, ignoreList);

  // 2) Sort file paths if you want a particular order (e.g., alphabetical)
  filePaths.sort();

  // 3) We'll iterate over the file paths, build lines for each, and write them in
  //    chunks of up to MAX_LINES_PER_FILE.
  let currentFileIndex = 1;
  let currentFileName = getOutputFileName(projectName, currentFileIndex);
  let currentOutputStream = fs.createWriteStream(currentFileName, { encoding: "utf8" });
  let currentLineCount = 0;

  // Helper to close current file stream if open
  function closeCurrentFileStream() {
    if (currentOutputStream) {
      currentOutputStream.end();
      console.log(`Finished writing: ${currentFileName} (total lines: ${currentLineCount})`);
    }
  }

  for (const filePath of filePaths) {
    // Build the lines for this file
    const linesForThisFile = buildFileLines(filePath, rootDir, projectName);
    const fileLineCount = linesForThisFile.length;

    // If adding this file would exceed our limit in the current file, 
    // then close the current file and open a new one.
    if (currentLineCount + fileLineCount > MAX_LINES_PER_FILE) {
      closeCurrentFileStream();

      // Move to the next output file
      currentFileIndex++;
      currentFileName = getOutputFileName(projectName, currentFileIndex);
      currentOutputStream = fs.createWriteStream(currentFileName, { encoding: "utf8" });
      currentLineCount = 0;
    }

    // Write each line (plus newline) to the current output
    for (const line of linesForThisFile) {
      currentOutputStream.write(line + "\n");
    }

    // Update line count
    currentLineCount += fileLineCount;
  }

  // Done with all files; close out the final file.
  closeCurrentFileStream();

  console.log("All done!");
}

// --------------------------------------------------------------------------
// If run directly from the CLI
// --------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Usage: node combine_codebase_split_by_lines.mjs <project_name> [root_directory]
  if (process.argv.length < 3) {
    console.log("Usage: node combine_codebase_split_by_lines.mjs <project_name> [root_directory]");
    process.exit(1);
  }

  const projectName = process.argv[2];
  const rootDir = process.argv[3] || "."; // Default to current directory if not specified
  MAX_LINES_PER_FILE =  process.argv[4] || 5000
  combineCodebaseWithLineLimit(projectName, rootDir);
}

// Export if you need to import this function elsewhere
export { combineCodebaseWithLineLimit };
