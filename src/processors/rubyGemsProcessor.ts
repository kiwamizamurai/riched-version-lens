import { FileProcessor, VersionInfo } from '../types/fileTypes';
import { RubyGemsProvider } from '../providers/rubyGemsProvider';

export class RubyGemsProcessor implements FileProcessor {
    private rubyGemsProvider: RubyGemsProvider;

    constructor() {
        this.rubyGemsProvider = new RubyGemsProvider();
    }

    public async processLine(line: string): Promise<VersionInfo | null> {
        const requirement = this.rubyGemsProvider.parseGemfile(line);
        if (!requirement) {
            return null;
        }

        const latestVersion = await this.rubyGemsProvider.getLatestVersion(requirement.name);
        if (!latestVersion) {
            return null;
        }

        return {
            name: requirement.name,
            currentVersion: requirement.currentVersion,
            latestVersion: latestVersion,
        };
    }

    public reset(): void {
        // Ruby processor doesn't need state reset
    }
}
