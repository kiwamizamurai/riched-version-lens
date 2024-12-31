import { FileProcessor, VersionInfo } from '../types/fileTypes';
import { PythonProvider } from '../providers/pythonProvider';

export class PythonProcessor implements FileProcessor {
    private pythonProvider: PythonProvider;
    private fileContent: string;
    private isPyProjectTOML: boolean;

    constructor() {
        this.pythonProvider = new PythonProvider();
        this.fileContent = '';
        this.isPyProjectTOML = false;
    }

    public async processLine(line: string): Promise<VersionInfo | null> {
        if (this.isPyProjectTOML) {
            this.fileContent += line + '\n';
            return null;
        }

        const requirement = this.pythonProvider.parseRequirement(line);
        if (!requirement) {
            return null;
        }

        const latestVersion = await this.pythonProvider.getLatestVersion(requirement.name);
        if (!latestVersion) {
            return null;
        }

        return {
            name: requirement.name,
            currentVersion: requirement.currentVersion,
            latestVersion: latestVersion,
        };
    }

    public async processEntireFile(): Promise<VersionInfo[]> {
        if (!this.isPyProjectTOML) {
            return [];
        }

        const dependencies = this.pythonProvider.parsePyProjectTOML(this.fileContent);
        const results: VersionInfo[] = [];

        for (const dep of dependencies) {
            const latestVersion = await this.pythonProvider.getLatestVersion(dep.name);
            if (latestVersion) {
                results.push({
                    name: dep.name,
                    currentVersion: dep.currentVersion,
                    latestVersion: latestVersion,
                });
            }
        }

        return results;
    }

    public setFileType(fileType: string): void {
        this.isPyProjectTOML = fileType === 'pyproject.toml';
        this.reset();
    }

    public reset(): void {
        this.fileContent = '';
    }
}
