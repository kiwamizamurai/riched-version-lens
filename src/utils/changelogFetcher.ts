import axios from 'axios';
import * as semver from 'semver';
import { logger } from './logger';
import * as vscode from 'vscode';
import path from 'path';

// Changelog cache (in-memory)
interface ChangelogCacheEntry {
    content: string;
    timestamp: number;
}

const changelogCache: { [key: string]: ChangelogCacheEntry } = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

type PackageManagerType = 'npm' | 'pypi' | 'rubygems';

export async function fetchChangelog(packageName: string, version: string, fileType: string): Promise<string | null> {
    logger.debug(`Fetching changelog for ${packageName}@${version} (fileType: ${fileType})`);
    const cacheKey = `${packageName}@${version}`;

    const config = vscode.workspace.getConfiguration('riched-version-lens');
    const shouldCache = config.get<boolean>('enableChangelogCache', true);

    // Cache check only if caching is enabled
    if (shouldCache && changelogCache[cacheKey] && Date.now() - changelogCache[cacheKey].timestamp < CACHE_DURATION) {
        logger.debug(`Found cached changelog for ${packageName}@${version}`);
        return changelogCache[cacheKey].content;
    }

    // Determine package manager based on file type
    const packageManager = getPackageManager(fileType);
    logger.debug(`Determined package manager: ${packageManager}`);
    if (!packageManager) {
        logger.warn(`Unsupported file type: ${fileType}`);
        return null;
    }

    let changelog: string | null = null;

    try {
        logger.debug(`Attempting to fetch changelog using ${packageManager} handler`);
        switch (packageManager) {
            case 'npm':
                changelog = await fetchNpmChangelog(packageName, version);
                break;
            case 'pypi':
                changelog = await fetchPyPIChangelog(packageName, version);
                break;
            case 'rubygems':
                changelog = await fetchRubyGemsChangelog(packageName, version);
                break;
        }

        logger.debug(`Changelog fetch result: ${changelog ? 'Found' : 'Not found'}`);
        if (changelog) {
            logger.debug(`Changelog length: ${changelog.length} characters`);
        }
    } catch (error) {
        logger.error(`Error during changelog fetch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }

    if (changelog) {
        logger.info(`Found ${packageManager} changelog for ${packageName}@${version}`);
        cacheChangelog(cacheKey, changelog);
        return changelog;
    }

    logger.warn(`No changelog found for ${packageName}@${version}`);
    return null;
}

function getPackageManager(fileType: string): PackageManagerType | null {
    const normalizedFile = path.basename(fileType).toLowerCase();
    logger.debug(`Normalized file type: ${normalizedFile}`);

    switch (normalizedFile) {
        case 'package.json':
            return 'npm';
        case 'requirements.txt':
        case 'pyproject.toml':
            return 'pypi';
        case 'gemfile':
            return 'rubygems';
        default:
            logger.debug(`No package manager found for file type: ${normalizedFile}`);
            return null;
    }
}

async function fetchNpmChangelog(packageName: string, version: string): Promise<string | null> {
    try {
        logger.debug(`Fetching NPM changelog for ${packageName}@${version}`);
        const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
        const data = response.data;

        // Check if changelog URL is directly specified in package metadata
        if (data.versions[version]?.changelog) {
            try {
                const changelogResponse = await axios.get(data.versions[version].changelog);
                return changelogResponse.data;
            } catch (error) {
                logger.debug(`Failed to fetch changelog from direct URL for ${packageName}:`, error);
            }
        }

        // Try to find changelog in repository
        const repository = data.versions[version]?.repository?.url || data.repository?.url;
        if (repository) {
            const repoUrl = repository
                .replace('git+', '')
                .replace('git:', '')
                .replace('.git', '')
                .replace('github.com:', 'github.com/')
                .replace('git@github.com', 'https://github.com');

            // Check common changelog file patterns
            const changelogPatterns = [
                'CHANGELOG.md',
                'changelog.md',
                'CHANGES.md',
                'changes.md',
                'HISTORY.md',
                'history.md',
            ];

            for (const pattern of changelogPatterns) {
                try {
                    const changelogUrl = `${repoUrl.replace(
                        'github.com',
                        'raw.githubusercontent.com'
                    )}/master/${pattern}`;
                    logger.debug(`Trying changelog URL for ${packageName}: ${changelogUrl}`);
                    const changelogResponse = await axios.get(changelogUrl);
                    if (changelogResponse.status === 200) {
                        return changelogResponse.data;
                    }
                } catch (error) {
                    logger.debug(`Failed to fetch changelog from ${pattern} for ${packageName}:`, error);
                }
            }
        }

        return null;
    } catch (error) {
        logger.error(`Error fetching NPM changelog for ${packageName}@${version}:`, error);
        return null;
    }
}

async function fetchPyPIChangelog(packageName: string, version: string): Promise<string | null> {
    try {
        logger.debug(`Fetching PyPI changelog for ${packageName}@${version}`);
        const response = await axios.get(`https://pypi.org/pypi/${packageName}/${version}/json`);
        const data = response.data;

        // Try project URLs first
        if (data.info?.project_urls) {
            logger.debug(`Checking project URLs for ${packageName}:`, data.info.project_urls);
            const changelogUrl =
                data.info.project_urls.Changelog ||
                data.info.project_urls.Changes ||
                data.info.project_urls['Release Notes'] ||
                data.info.project_urls.History;

            if (changelogUrl) {
                logger.debug(`Found changelog URL for ${packageName}: ${changelogUrl}`);
                // Skip fetching if it's a documentation URL
                if (changelogUrl.includes('docs.') || changelogUrl.includes('/docs/')) {
                    logger.debug('Skipping documentation URL, moving to next method');
                } else {
                    try {
                        const response = await axios.get(changelogUrl);
                        return response.data;
                    } catch (error) {
                        logger.debug(`Failed to fetch changelog from URL for ${packageName}:`, error);
                    }
                }
            }
        }

        // Try repository if available
        if (data.info?.home_page || data.info?.project_urls?.Homepage || data.info?.project_urls?.Source) {
            const repoUrl = data.info.home_page || data.info.project_urls?.Homepage || data.info.project_urls?.Source;
            if (repoUrl?.includes('github.com')) {
                logger.debug(`Trying GitHub repository: ${repoUrl}`);
                const githubUrl = repoUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace(/\/?$/, '/master/');

                const changelogPatterns = [
                    'CHANGELOG.md',
                    'changelog.md',
                    'CHANGES.md',
                    'changes.md',
                    'HISTORY.md',
                    'history.md',
                    'CHANGELOG.rst',
                    'changelog.rst',
                ];

                for (const pattern of changelogPatterns) {
                    try {
                        const changelogUrl = `${githubUrl}${pattern}`;
                        logger.debug(`Trying changelog URL: ${changelogUrl}`);
                        const response = await axios.get(changelogUrl);
                        if (response.status === 200) {
                            return response.data;
                        }
                    } catch (error) {
                        logger.debug(`Failed to fetch ${pattern} from repository:`, error);
                    }
                }
            }
        }

        // Try description as last resort
        if (data.info?.description) {
            logger.debug(`Checking description for ${packageName}`);
            const description = data.info.description.toLowerCase();
            const changelogKeywords = ['changelog', 'changes', 'history', "what's new", 'release notes'];

            for (const keyword of changelogKeywords) {
                const index = description.indexOf(keyword);
                if (index !== -1) {
                    logger.debug(`Found ${keyword} section in description`);
                    // Extract from the found keyword to the end or next major section
                    const section = data.info.description.substring(index);
                    return section.split(/\n#\s/)[0]; // Split at next major heading
                }
            }
        }

        logger.debug(`No changelog found for ${packageName}@${version}`);
        return null;
    } catch (error) {
        logger.error(`Error fetching PyPI changelog for ${packageName}@${version}:`, error);
        return null;
    }
}

async function fetchRubyGemsChangelog(packageName: string, version: string): Promise<string | null> {
    try {
        // バージョン文字列からスペースを削除
        const cleanVersion = version.trim();
        logger.debug(`Fetching RubyGems changelog for ${packageName}@${cleanVersion}`);
        // Get gem details from the v2 API
        const gemResponse = await axios.get(
            `https://rubygems.org/api/v2/rubygems/${packageName}/versions/${cleanVersion}.json`
        );
        const gemData = gemResponse.data;

        // First try to get changelog from metadata.changelog_uri
        const changelogUri = gemData.metadata?.changelog_uri;
        if (changelogUri) {
            try {
                // Special handling for GitHub releases
                if (changelogUri.includes('/releases/tag/')) {
                    const releaseApiUrl = changelogUri.replace(
                        /github\.com\/([^/]+\/[^/]+)\/releases\/tag\/(.+)/,
                        'api.github.com/repos/$1/releases/tags/$2'
                    );
                    logger.debug(`Fetching GitHub release notes from: ${releaseApiUrl}`);
                    const releaseResponse = await axios.get(releaseApiUrl);
                    if (releaseResponse.data?.body) {
                        return releaseResponse.data.body;
                    }
                    logger.warn(`No changelog found for ${packageName}@${version} in GitHub releases`);
                } else {
                    // For regular changelog files
                    const changelogUrl = changelogUri.replace('github.com', 'raw.githubusercontent.com');
                    logger.debug(`Found changelog URI for ${packageName}: ${changelogUrl}`);
                    const changelogResponse = await axios.get(changelogUrl);
                    if (changelogResponse.status === 200) {
                        return changelogResponse.data;
                    }
                }
            } catch (error) {
                logger.debug(`Failed to fetch changelog from changelog_uri for ${packageName}:`, error as Error);
            }
        }

        // Fallback: Try to find changelog in source code repository if available
        if (gemData.metadata?.source_code_uri) {
            const repoUrl = gemData.metadata.source_code_uri;
            logger.debug(`Found source code URI for ${packageName}: ${repoUrl}`);
            // Check common changelog file patterns
            const changelogPatterns = [
                'CHANGELOG.md',
                'changelog.md',
                'CHANGES.md',
                'changes.md',
                'HISTORY.md',
                'history.md',
            ];

            for (const pattern of changelogPatterns) {
                try {
                    const changelogUrl = `${repoUrl.replace(
                        'github.com',
                        'raw.githubusercontent.com'
                    )}/master/${pattern}`;
                    logger.debug(`Trying changelog URL for ${packageName}: ${changelogUrl}`);
                    const changelogResponse = await axios.get(changelogUrl);
                    if (changelogResponse.status === 200) {
                        return changelogResponse.data;
                    }
                } catch (error) {
                    logger.debug(`Failed to fetch changelog from ${pattern} for ${packageName}:`, error);
                }
            }
        }

        return null;
    } catch (error) {
        logger.error(`Error fetching RubyGems changelog for ${packageName}@${version}:`, error);
        return null;
    }
}

function cacheChangelog(key: string, content: string): void {
    const config = vscode.workspace.getConfiguration('riched-version-lens');
    const shouldCache = config.get<boolean>('enableChangelogCache', true);

    if (shouldCache) {
        logger.debug(`Caching changelog for ${key}`);
        changelogCache[key] = {
            content,
            timestamp: Date.now(),
        };
    } else {
        logger.debug(`Caching disabled, skipping cache for ${key}`);
    }
}
