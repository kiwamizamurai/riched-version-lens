import { FileProcessor, VersionInfo } from '../types/fileTypes';
import { NpmProvider } from '../providers/npmProvider';
import { logger } from '../utils/logger';

export class NpmProcessor implements FileProcessor {
    private npmProvider: NpmProvider;
    private isFirstLine: boolean = true;

    constructor() {
        this.npmProvider = new NpmProvider();
    }

    public async processLine(line: string): Promise<VersionInfo | null> {
        if (this.isFirstLine) {
            logger.debug('Processing new NPM package.json file');
            this.npmProvider.reset();
            this.isFirstLine = false;
        }

        const requirement = this.npmProvider.parsePackageJson(line);
        if (!requirement) {
            return null;
        }

        logger.debug(`Processing NPM package: ${requirement.name}@${requirement.currentVersion}`);
        const latestVersion = await this.npmProvider.getLatestVersion(requirement.name);
        if (!latestVersion) {
            logger.warn(`Failed to fetch latest version for ${requirement.name}`);
            return null;
        }

        return {
            name: requirement.name,
            currentVersion: requirement.currentVersion,
            latestVersion: latestVersion,
        };
    }

    public reset(): void {
        this.isFirstLine = true;
    }
}
