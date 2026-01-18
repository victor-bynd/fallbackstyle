import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPS_DIR = path.join(__dirname, '../src/apps');
const APPS = ['brand-font', 'multi-language'];

function getStagedFiles() {
    try {
        const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
        return output.split('\n').filter(Boolean);
    } catch (error) {
        console.error('Error getting staged files:', error);
        process.exit(1);
    }
}

function incrementVersion(version) {
    const parts = version.split('.');
    if (parts.length !== 3) return version; // Fallback or error?
    parts[2] = parseInt(parts[2], 10) + 1;
    return parts.join('.');
}

function updateAppVersion(appName) {
    const versionFilePath = path.join(APPS_DIR, appName, 'version.json');

    if (!fs.existsSync(versionFilePath)) {
        console.warn(`Version file not found for ${appName} at ${versionFilePath}`);
        return;
    }

    try {
        const versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
        const oldVersion = versionData.version;
        const newVersion = incrementVersion(oldVersion);

        versionData.version = newVersion;

        fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2) + '\n');
        console.log(`Updated ${appName} version: ${oldVersion} -> ${newVersion}`);

        // Add the updated version file back to the commit
        execSync(`git add "${versionFilePath}"`);

    } catch (error) {
        console.error(`Error updating version for ${appName}:`, error);
        process.exit(1);
    }
}

function main() {
    const stagedFiles = getStagedFiles();
    const appsToUpdate = new Set();
    let updateAll = false;

    // Define what constitutes a "shared" change that affects multiple apps
    const isSharedFile = (file) => {
        return file.startsWith('src/shared/') ||
            file === 'src/App.jsx' ||
            file === 'src/main.jsx' ||
            file === 'src/index.css';
    };

    for (const file of stagedFiles) {
        if (isSharedFile(file)) {
            updateAll = true;
            // No need to check other files if we already know we update all
            break;
        }

        if (file.startsWith('src/apps/brand-font/')) {
            appsToUpdate.add('brand-font');
        } else if (file.startsWith('src/apps/multi-language/')) {
            appsToUpdate.add('multi-language');
        }
    }

    if (updateAll) {
        console.log('Shared files changed. updating ALL apps.');
        appsToUpdate.add('brand-font');
        appsToUpdate.add('multi-language');
    }

    if (appsToUpdate.size === 0) {
        console.log('No app changes detected. Skipping version increment.');
        return;
    }

    appsToUpdate.forEach(appName => {
        updateAppVersion(appName);
    });
}

main();
