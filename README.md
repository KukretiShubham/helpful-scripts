# Collection of Node.js scripts

### combine_codebase.js: 

script that flattens your codebase into a single text file with a tree view and file contents. It skips hidden files, certain directories, markdown files, and known media files (e.g., .png, .jpg). This is helpful for quickly reviewing or sharing an entire project in a single file.
- Tree Overview: Generates a simplified "tree" of the project folders and files (excluding ignored files/folders).
- Flattened Output: Combines all valid text files into a single .txt file, showing each file path and its contents.
- Customizable Ignores: Skips:
    - Hidden items (files/directories starting with .)
    - Certain directories (e.g., .git, node_modules)
    - Markdown files (.md)
    - Common media file extensions (.png, .jpg, .gif, etc.)
run : `node ./flatcode.js <project_name> [root_directory]`

### clean_node_module.js
Script that recursively removes all node_modules directories within a specified root folder. This is helpful if you have multiple Node.js projects nested under one directory and you want to clean them up to free disk space or avoid conflicts.

Usage:

```bash
node ./clean_node_module.js <path_to_Projects>
```
For example, if your directory structure is:


```bash
Projects
|-- Project1
|   `-- node_modules
|-- Project2
|   `-- node_modules
`-- Project3
    `-- node_modules
```

Run:

```bash
node ./clean_node_module.js ./Projects
```
This will recursively find and remove every node_modules folder under Projects.

Note: Make sure you have permissions to remove the directories. Use with caution since this cannot be undone.


# Getting Started
Clone this repository (or download the code directly):
```bash
git clone <your_repo_url>
cd <your_repo_folder>
```

# Run the script:

```bash
node ./<script_name>.js <arg1> [arg2]
```