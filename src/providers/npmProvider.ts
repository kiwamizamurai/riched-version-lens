import axios from 'axios';
import { logger } from '../utils/logger';

interface NpmResponse {
    'dist-tags': {
        latest: string;
    };
}

export class NpmProvider {
    private static readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org';
    private inDependencies: boolean = false;
    private inDevDependencies: boolean = false;

    async getLatestVersion(packageName: string): Promise<string | null> {
        try {
            logger.debug(`Fetching latest version for NPM package: ${packageName}`);
            const response = await axios.get<NpmResponse>(`${NpmProvider.NPM_REGISTRY_URL}/${packageName}`);
            return response.data['dist-tags'].latest;
        } catch (error) {
            logger.error(`Error fetching NPM version for ${packageName}`, error as Error);
            return null;
        }
    }

    parsePackageJson(line: string): { name: string; currentVersion: string } | null {
        // Detect the start/end of dependencies or devDependencies section
        if (line.includes('"dependencies"')) {
            this.inDependencies = true;
            return null;
        } else if (line.includes('"devDependencies"')) {
            this.inDevDependencies = true;
            return null;
        } else if (line.trim() === '},') {
            this.inDependencies = false;
            this.inDevDependencies = false;
            return null;
        }

        // Only parse if within dependencies or devDependencies section
        if (!this.inDependencies && !this.inDevDependencies) {
            return null;
        }

        // Parse dependency line in package.json
        const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
        if (!match) return null;

        const version = match[2].replace(/[\^~>=<]/g, ''); // Remove version specifiers
        const result = {
            name: match[1],
            currentVersion: version,
        };

        if (result) {
            logger.debug(`Parsed NPM dependency: ${result.name}@${result.currentVersion}`);
        }
        return result;
    }

    // Reset state (used when processing a new file)
    reset(): void {
        this.inDependencies = false;
        this.inDevDependencies = false;
    }
}
