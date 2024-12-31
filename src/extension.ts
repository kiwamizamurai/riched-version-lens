import * as vscode from 'vscode';
import { ChangelogHoverProvider } from './providers/changelogHoverProvider';
import { logger } from './utils/logger';
import { VersionChecker } from './core/versionChecker';

export function activate(context: vscode.ExtensionContext) {
    logger.info('Activating Riched Version Lens extension');

    // Register hover providers for each supported file type
    const supportedFiles = [
        { pattern: '**/package.json', language: 'json' },
        { pattern: '**/requirements.txt' },
        { pattern: '**/pyproject.toml', language: 'toml' },
        { pattern: '**/[Gg]emfile' },
    ];

    // Initialize VersionChecker
    const versionChecker = VersionChecker.getInstance();
    context.subscriptions.push(versionChecker);

    // Register hover providers
    for (const file of supportedFiles) {
        logger.debug(`Registering hover provider for ${file.pattern} with language ${file.language}`);
        context.subscriptions.push(
            vscode.languages.registerHoverProvider(
                {
                    scheme: 'file',
                    pattern: file.pattern,
                    language: file.language,
                },
                new ChangelogHoverProvider()
            )
        );
    }

    // Register show logs command
    const showLogsCommand = vscode.commands.registerCommand('riched-version-lens.showLogs', () => {
        logger.show();
    });
    context.subscriptions.push(showLogsCommand);

    logger.info('Riched Version Lens extension activated successfully');
}

export function deactivate() {
    logger.info('Deactivating Riched Version Lens extension');
}
