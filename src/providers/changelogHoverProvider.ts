import * as vscode from 'vscode';
import { fetchChangelog } from '../utils/changelogFetcher';
import { logger } from '../utils/logger';
import * as path from 'path';

export class ChangelogHoverProvider implements vscode.HoverProvider {
    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | null> {
        try {
            logger.debug(`Attempting to provide hover for: ${document.fileName}`);
            logger.debug(`Document language ID: ${document.languageId}`);
            logger.debug(`Document URI scheme: ${document.uri.scheme}`);

            const line = document.lineAt(position.line);
            logger.debug(`Line content: ${line.text}`);

            const dependencyInfo = this.getDependencyInfo(document.fileName, line);

            if (!dependencyInfo) {
                logger.debug('No dependency info found in this line');
                return null;
            }

            logger.debug(`Fetching changelog for ${dependencyInfo.packageName}@${dependencyInfo.version}`);
            const fileType = path.basename(document.fileName).toLowerCase();
            const changelog = await fetchChangelog(dependencyInfo.packageName, dependencyInfo.version, fileType);

            if (!changelog) {
                logger.debug(`No changelog found for ${dependencyInfo.packageName}@${dependencyInfo.version}`);
                return null;
            }

            const markdownContent = new vscode.MarkdownString();
            markdownContent.appendMarkdown(`## ${dependencyInfo.packageName} ${dependencyInfo.version} Changelog\n\n`);
            markdownContent.appendMarkdown(changelog);
            return new vscode.Hover(markdownContent);
        } catch (error) {
            logger.error('Error providing hover', error);
            return null;
        }
    }

    private getDependencyInfo(
        filePath: string,
        line: vscode.TextLine
    ): { packageName: string; version: string } | null {
        // Get the base filename
        const fileName = path.basename(filePath).toLowerCase();
        logger.debug(`Processing file: ${fileName} with line: ${line.text}`);

        // Parse based on file type
        let result = null;
        logger.debug(`Attempting to parse file: ${fileName}`);

        if (fileName.endsWith('package.json')) {
            logger.debug('Detected package.json file');
            result = this.parsePackageJson(line);
        } else if (fileName === 'requirements.txt') {
            logger.debug('Detected requirements.txt file');
            result = this.parseRequirementsTxt(line);
        } else if (fileName === 'pyproject.toml') {
            logger.debug('Detected pyproject.toml file');
            result = this.parsePyprojectToml(line);
        } else if (fileName === 'gemfile') {
            logger.debug('Detected Gemfile');
            result = this.parseGemfile(line);
        } else {
            logger.debug('No matching file type found');
        }

        logger.debug(`Parsing result for ${fileName}: ${JSON.stringify(result)}`);
        return result;
    }

    // Parse package.json
    private parsePackageJson(line: vscode.TextLine): { packageName: string; version: string } | null {
        logger.debug('Parsing package.json line');
        const match = line.text.match(/"([^"]+)":\s*"([^"]+)"/);
        if (match) {
            return {
                packageName: match[1],
                version: match[2],
            };
        }
        return null;
    }

    // Parse requirements.txt
    private parseRequirementsTxt(line: vscode.TextLine): { packageName: string; version: string } | null {
        logger.debug('Parsing requirements.txt line');

        const lineText = line.text.trim();

        // Skip comments and empty lines
        if (lineText.startsWith('#') || !lineText) {
            return null;
        }

        // Match patterns
        const patterns = [
            // Package with version specifier
            /^([A-Za-z0-9\-_.]+)\s*(==|>=|<=|~=|!=|>|<|===)\s*([0-9A-Za-z\-_.]+)/,
            // Package with extras and version specifier
            /^([A-Za-z0-9\-_.]+)\[[^\]]+\]\s*(==|>=|<=|~=|!=|>|<|===)\s*([0-9A-Za-z\-_.]+)/,
            // Just package name (for latest version)
            /^([A-Za-z0-9\-_.]+)$/,
        ];

        for (const pattern of patterns) {
            const match = lineText.match(pattern);
            if (match) {
                return {
                    packageName: match[1].trim(),
                    version: match[3] ? match[3].trim() : 'latest',
                };
            }
        }

        logger.debug(`No match found for line: "${lineText}"`);
        return null;
    }

    // Parse pyproject.toml
    private parsePyprojectToml(line: vscode.TextLine): { packageName: string; version: string } | null {
        logger.debug('Parsing pyproject.toml line');

        // 既存のパターン
        const simpleMatch = line.text.match(/([^=\s]+)\s*=\s*["']([^"']+)["']/);
        const complexMatch = line.text.match(/([^=\s]+)\s*=\s*{\s*version\s*=\s*["']([^"']+)["']/);
        // 新しいパターン: "package>=version" 形式
        const quotedDependencyMatch = line.text.match(/["']([^"']+)([>=<]+)([^"',\s]+)["']/);

        logger.debug(`Line content: "${line.text}"`);
        logger.debug(`Matches - simple: ${simpleMatch}, complex: ${complexMatch}, quoted: ${quotedDependencyMatch}`);

        if (simpleMatch) {
            return {
                packageName: simpleMatch[1].trim(),
                version: simpleMatch[2].replace(/[>=<~^]/g, ''),
            };
        } else if (complexMatch) {
            return {
                packageName: complexMatch[1].trim(),
                version: complexMatch[2].replace(/[>=<~^]/g, ''),
            };
        } else if (quotedDependencyMatch) {
            return {
                packageName: quotedDependencyMatch[1].trim(),
                version: quotedDependencyMatch[3],
            };
        }
        return null;
    }

    // Parse Gemfile
    private parseGemfile(line: vscode.TextLine): { packageName: string; version: string } | null {
        logger.debug('Parsing Gemfile line');
        // Parse gem line (example: gem 'rails', '~> 7.0.0')
        const match = line.text.match(/gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/);
        if (!match) return null;

        // Return null if version is not specified
        if (!match[2]) return null;

        return {
            packageName: match[1],
            version: match[2].replace(/[~>=<]/g, ''),
        };
    }
}
