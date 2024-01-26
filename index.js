import fs from 'fs'
import path from 'path';
import { v4 as UUID } from 'uuid'
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
const packages = ['@minecraft/server', '@minecraft/server-ui'];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versions = await CheckForUpdates();

const uiversion = versions[1].version.split('-')[0] + '-beta';
const version = versions[0].version.split('-')[0] + '-beta';

const manifestExists = fs.existsSync(path.join(__dirname, './manifest.json'));
if (!manifestExists) {
    fs.writeFileSync(path.join(__dirname, './manifest.json'), JSON.stringify({
        format_version: 2,
        header: {
            name: 'new Manifest',
            description: 'A new manifest',
            uuid: UUID(),
            version: [1, 0, 0],
            min_engine_version: [1, 20, 40]
        },
        modules: [
            {
                type: 'data',
                uuid: UUID(),
                version: [0, 0, 1]
            },
            {
                type: 'script',
                language: 'javascript',
                entry: 'scripts/index.js',
                uuid: UUID(),
                version: version
            }
        ],
        dependencies: [
            {
                module_name: '@minecraft/server',
                version: version
            },
            {
                module_name: '@minecraft/server-ui',
                version: uiversion
            }
        ]
    }, null, 4));
	console.warn(`\x1b[33m[WARNING]\x1b[0m manifest.json did not exist, so it was created with the latest versions.`);
} else {
	const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../manifest.json')).toString());
	manifest.dependencies[0].version = version;
	manifest.dependencies[1].version = uiversion;
	manifest.modules[1].version = version;
	fs.writeFileSync(path.join(__dirname, '../manifest.json'), JSON.stringify(manifest, null, 4));
	console.log(`\x1b[32m[INFO]\x1b[0m Updated manifest.json to latest versions!`);
}

export default async function CheckForUpdates() {
    const done = [];
    const promises = packages.map(async (pkg) => {
        const versionsOutput = execSync(`npm show ${pkg} versions`).toString();
        const versionsArray = JSON.parse(versionsOutput.replace(/'/g, '"'));
        const latestVersion = `${versionsArray.filter((v) => v.includes('-stable')).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))[0]}`;
        let installedVersion;
        try {
            installedVersion = execSync(`npm list ${pkg}`).toString().split(`${pkg}@`)[1].split('\n')[0].replace('deduped', '').replace(' ', '');
            if (installedVersion !== latestVersion) {
                console.log(`\x1b[33m[WARNING]\x1b[0m The latest version of ${pkg} is ${latestVersion}, but you have ${installedVersion} installed.\n \x1b[33m[WARNING]\x1b[0m Installing latest version...`);
                await installPackage(`${pkg}@${latestVersion}`);
                console.log(`\x1b[32m[INFO]\x1b[0m Installed latest version of ${pkg} (${latestVersion})`);
                done.push({ pkg, version: latestVersion });
            } else {
                console.log(`\x1b[32m[INFO]\x1b[0m ${pkg} is up to date! (${installedVersion})`);
                done.push({ pkg, version: installedVersion });
            }
        } catch (e) {
            console.log(`\x1b[33m[WARNING]\x1b[0m The latest version of ${pkg} is ${latestVersion}, but you have nothing installed.\n \x1b[33m[WARNING]\x1b[0m Installing latest version...`);
            await installPackage(`${pkg}@${latestVersion}`);
            console.log(`\x1b[32m[INFO]\x1b[0m Installed latest version of ${pkg} (${latestVersion})`);
            done.push({ pkg, version: latestVersion });
        }
    });
    await Promise.all(promises);
    return done;
}

async function installPackage(packageName) {
    return new Promise((resolve, reject) => {
        try {
            execSync(`npm install ${packageName}`)
            resolve();
        } catch (e) {
            reject(e);
        }
    })
}
