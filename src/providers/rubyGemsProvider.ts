import axios from 'axios';
import { logger } from '../utils/logger';

interface RubyGemsResponse {
    version: string;
}

export class RubyGemsProvider {
    private static readonly RUBYGEMS_API_URL = 'https://rubygems.org/api/v1';

    async getLatestVersion(gemName: string): Promise<string | null> {
        try {
            logger.debug(`Fetching latest version for Ruby gem: ${gemName}`);
            const response = await axios.get<RubyGemsResponse>(
                `${RubyGemsProvider.RUBYGEMS_API_URL}/gems/${gemName}.json`
            );
            return response.data.version;
        } catch (error) {
            logger.error(`Error fetching RubyGems version for ${gemName}`, error as Error);
            return null;
        }
    }

    parseGemfile(line: string): { name: string; currentVersion: string } | null {
        // Parse gem line (example: gem 'rails', '~> 7.0.0')
        const match = line.match(/gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/);
        if (!match) return null;

        // Return null if version is not specified
        if (!match[2]) return null;

        const version = match[2].replace(/[\^~>=<]/g, '').trim(); // Remove version specifiers and trim whitespace
        if (!version) {
            logger.error(`Failed to parse version for Ruby gem: ${match[1]}`);
            return null;
        }

        const result = {
            name: match[1],
            currentVersion: version,
        };
        logger.debug(`Parsed Ruby gem: ${result.name}@${result.currentVersion}`);
        return result;
    }
}
