import axios from 'axios';
import * as TOML from '@iarna/toml';

interface PyPIResponse {
    info: {
        version: string;
    };
}

interface PyProjectTOML {
    project?: {
        dependencies?: string[];
        'optional-dependencies'?: Record<string, string[]>;
    };
}

export class PythonProvider {
    private static readonly PYPI_API_URL = 'https://pypi.org/pypi';

    async getLatestVersion(packageName: string): Promise<string> {
        try {
            const response = await axios.get<PyPIResponse>(`${PythonProvider.PYPI_API_URL}/${packageName}/json`);
            return response.data.info.version;
        } catch (error) {
            console.error(`Error fetching version for ${packageName}:`, error);
            return '';
        }
    }

    parseRequirement(line: string): { name: string; currentVersion: string } | null {
        // Match patterns like: package==1.0.0, package>=1.0.0, package~=1.0.0
        const match = line.match(/^([a-zA-Z0-9-_.]+)\s*(==|>=|~=)\s*([\d.]+)/);
        if (!match) return null;

        return {
            name: match[1],
            currentVersion: match[3],
        };
    }

    parsePyProjectTOML(content: string): { name: string; currentVersion: string }[] {
        try {
            const parsed = TOML.parse(content) as PyProjectTOML;
            const dependencies: { name: string; currentVersion: string }[] = [];

            // Parse main dependencies
            if (parsed.project?.dependencies) {
                for (const dep of parsed.project.dependencies) {
                    const parsed = this.parseRequirement(dep);
                    if (parsed) {
                        dependencies.push(parsed);
                    }
                }
            }

            // Parse optional dependencies
            if (parsed.project?.['optional-dependencies']) {
                for (const group of Object.values(parsed.project['optional-dependencies'])) {
                    for (const dep of group) {
                        const parsed = this.parseRequirement(dep);
                        if (parsed) {
                            dependencies.push(parsed);
                        }
                    }
                }
            }

            return dependencies;
        } catch (error) {
            console.error('Error parsing pyproject.toml:', error);
            return [];
        }
    }
}
