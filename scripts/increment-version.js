import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const SHARED_VERSION_PATH = path.join(ROOT_DIR, 'src/shared/version.json');

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
    if (parts.length !== 3) return version;
    parts[2] = parseInt(parts[2], 10) + 1;
    return parts.join('.');
}

function updateVersions() {
    try {
        // Read package.json as source of truth
        const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
        const oldVersion = pkg.version;
        const newVersion = incrementVersion(oldVersion);

        // Update package.json
        pkg.version = newVersion;
        fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`Updated package.json: ${oldVersion} -> ${newVersion}`);

        // Update shared version.json
        if (fs.existsSync(SHARED_VERSION_PATH)) {
            const sharedVersionData = { version: newVersion };
            fs.writeFileSync(SHARED_VERSION_PATH, JSON.stringify(sharedVersionData, null, 2) + '\n');
            console.log(`Updated shared version.json: ${newVersion}`);
        }

        // Add the updated files back to the commit
        execSync(`git add "${PACKAGE_JSON_PATH}" "${SHARED_VERSION_PATH}"`);

    } catch (error) {
        console.error(`Error updating versions:`, error);
        process.exit(1);
    }
}

function main() {
    const stagedFiles = getStagedFiles();

    // Check if any source files are changed
    const hasSourceChanges = stagedFiles.some(file =>
        file.startsWith('src/') ||
        file === 'package.json' ||
        file === 'vite.config.js' ||
        file === 'index.html'
    );

    if (!hasSourceChanges) {
        console.log('No source changes detected. Skipping version increment.');
        return;
    }

    console.log('Source changes detected, incrementing global version.');
    updateVersions();
}

main();
