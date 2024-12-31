import * as vscode from 'vscode';
import { MarkerProvider, UpdateNeededInfo } from './markerProvider';
import * as path from 'path';
import { SupportedFileType } from '../types/fileTypes';
import { ProcessorFactory } from '../processors/processorFactory';
import { logger } from '../utils/logger';

export class VersionChecker implements vscode.CodeLensProvider {
    private markerProvider: MarkerProvider;
    private static instance: VersionChecker | undefined;
    private debounceTimer: NodeJS.Timeout | undefined;
    private isUpdating: boolean = false;
    private readonly updateInterval: number = 300; // milliseconds
    private disposables: vscode.Disposable[] = [];

    private constructor() {
        logger.debug('Initializing VersionChecker');
        this.markerProvider = new MarkerProvider();

        this.disposables.push(
            vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    logger.debug(`Active editor changed: ${editor.document.fileName}`);
                    this.markerProvider.clearDecorations(editor);
                    const fileType = this.getFileType(editor.document.fileName);
                    if (fileType) {
                        logger.debug(`Processing file type: ${fileType}`);
                        this.scheduleUpdate();
                    }
                }
            })
        );

        this.disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                const activeEditor = vscode.window.activeTextEditor;
                if (
                    activeEditor &&
                    event.document === activeEditor.document &&
                    this.getFileType(activeEditor.document.fileName)
                ) {
                    this.scheduleUpdate();
                }
            })
        );
    }

    private getFileType(filePath: string): SupportedFileType | undefined {
        const fileName = path.basename(filePath);
        switch (fileName) {
            case 'requirements.txt':
                return 'requirements.txt';
            case 'pyproject.toml':
                return 'pyproject.toml';
            case 'package.json':
                return 'package.json';
            case 'Gemfile':
                return 'Gemfile';
            default:
                return undefined;
        }
    }

    private async processFile(editor: vscode.TextEditor, fileType: SupportedFileType): Promise<void> {
        const upToDateRanges: vscode.Range[] = [];
        const updateNeededInfos: UpdateNeededInfo[] = [];
        const processor = ProcessorFactory.getProcessor(fileType);

        processor.reset();

        if (fileType === 'pyproject.toml' && processor.processEntireFile) {
            // Process entire file for pyproject.toml
            for (let i = 0; i < editor.document.lineCount; i++) {
                const line = editor.document.lineAt(i);
                await processor.processLine(line.text);
            }

            const results = await processor.processEntireFile();
            for (const versionInfo of results) {
                // Find the line containing this dependency
                for (let i = 0; i < editor.document.lineCount; i++) {
                    const line = editor.document.lineAt(i);
                    if (line.text.includes(`"${versionInfo.name}>=`) || line.text.includes(`"${versionInfo.name}==`)) {
                        const range = new vscode.Range(i, line.text.length, i, line.text.length);
                        const isUpToDate = versionInfo.latestVersion === versionInfo.currentVersion;
                        if (isUpToDate) {
                            upToDateRanges.push(range);
                        } else {
                            updateNeededInfos.push({
                                range,
                                latestVersion: versionInfo.latestVersion as string,
                            });
                        }
                        break;
                    }
                }
            }
        } else {
            // Process line by line for other file types
            for (let i = 0; i < editor.document.lineCount; i++) {
                const line = editor.document.lineAt(i);
                const versionInfo = await processor.processLine(line.text);

                if (versionInfo && versionInfo.latestVersion) {
                    const range = new vscode.Range(i, line.text.length, i, line.text.length);
                    const isUpToDate = versionInfo.latestVersion === versionInfo.currentVersion;

                    if (isUpToDate) {
                        upToDateRanges.push(range);
                    } else {
                        updateNeededInfos.push({
                            range,
                            latestVersion: versionInfo.latestVersion as string,
                        });
                    }
                }
            }
        }

        this.markerProvider.updateDecorations(editor, upToDateRanges, updateNeededInfos);
    }

    public static getInstance(): VersionChecker {
        if (!VersionChecker.instance) {
            VersionChecker.instance = new VersionChecker();
        }
        return VersionChecker.instance;
    }

    private scheduleUpdate(): void {
        logger.debug('Scheduling version check update');
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.updateVersionStatus();
        }, this.updateInterval);
    }

    private async updateVersionStatus(): Promise<void> {
        if (this.isUpdating) {
            logger.debug('Update already in progress, skipping');
            return;
        }

        try {
            this.isUpdating = true;
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const fileType = this.getFileType(editor.document.fileName);
            if (!fileType) {
                this.markerProvider.clearDecorations(editor);
                return;
            }

            await this.processFile(editor, fileType);
        } catch (error) {
            logger.error('Error updating version status', error as Error);
        } finally {
            this.isUpdating = false;
        }
    }

    public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        if (this.getFileType(document.fileName)) {
            this.scheduleUpdate();
        }
        return [];
    }

    dispose() {
        this.markerProvider.dispose();
        this.disposables.forEach((d) => d.dispose());
    }
}
