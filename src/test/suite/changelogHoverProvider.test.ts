import * as assert from 'assert';
import * as vscode from 'vscode';
import { ChangelogHoverProvider } from '../../providers/changelogHoverProvider';
import { beforeEach, describe, it, afterEach } from 'mocha';
import { TestHelper } from './testHelper';

describe('ChangelogHoverProvider', () => {
    let provider: ChangelogHoverProvider;

    beforeEach(() => {
        provider = new ChangelogHoverProvider();
        TestHelper.setupMocks();
    });

    afterEach(() => {
        TestHelper.teardownMocks();
    });

    describe('getDependencyInfo', () => {
        it('should parse package.json dependency correctly', async () => {
            const document = {
                fileName: 'package.json',
                lineAt: (line: number) => ({
                    text: '    "express": "^4.18.2"',
                }),
            } as any as vscode.TextDocument;

            const line = document.lineAt(0);
            const result = (provider as any).getDependencyInfo(document.fileName, line);

            assert.deepStrictEqual(result, {
                packageName: 'express',
                version: '^4.18.2',
            });
        });

        it('should parse requirements.txt dependency correctly', async () => {
            const document = {
                fileName: 'requirements.txt',
                lineAt: (line: number) => ({
                    text: 'requests==2.31.0',
                }),
            } as any as vscode.TextDocument;

            const line = document.lineAt(0);
            const result = (provider as any).getDependencyInfo(document.fileName, line);

            assert.deepStrictEqual(result, {
                packageName: 'requests',
                version: '2.31.0',
            });
        });

        it('should return null for unsupported file type', async () => {
            const document = {
                fileName: 'unknown.txt',
                lineAt: (line: number) => ({
                    text: 'some content',
                }),
            } as any as vscode.TextDocument;

            const line = document.lineAt(0);
            const result = (provider as any).getDependencyInfo(document.fileName, line);

            assert.strictEqual(result, null);
        });
    });

    describe('provideHover', () => {
        it('should provide hover with changelog when available', async () => {
            const document = {
                fileName: 'package.json',
                uri: { scheme: 'file' },
                languageId: 'json',
                lineAt: (line: number) => ({
                    text: '    "express": "^4.18.2"',
                    range: new vscode.Range(0, 0, 0, 50),
                }),
            } as any as vscode.TextDocument;

            TestHelper.mockChangelog('express', '^4.18.2', '## Changes\n- New feature\n- Bug fix');

            const position = new vscode.Position(0, 15);
            const hover = await provider.provideHover(document, position);

            assert.notStrictEqual(hover, null);
            assert.ok(hover instanceof vscode.Hover);
            const content = (hover.contents[0] as vscode.MarkdownString).value;
            assert.ok(content.includes('## express ^4.18.2 Changelog'));
            assert.ok(content.includes('## Changes\n- New feature\n- Bug fix'));
        });

        it('should return null when no dependency is found', async () => {
            const document = {
                fileName: 'package.json',
                lineAt: (line: number) => ({
                    text: '    "name": "my-package"',
                }),
            } as any as vscode.TextDocument;

            const position = new vscode.Position(0, 15);
            const hover = await provider.provideHover(document, position);

            assert.strictEqual(hover, null);
        });

        it('should return null when changelog fetch fails', async () => {
            const document = {
                fileName: 'package.json',
                lineAt: (line: number) => ({
                    text: '    "express": "^4.18.2"',
                }),
            } as any as vscode.TextDocument;

            TestHelper.mockChangelogError('express', '^4.18.2');

            const position = new vscode.Position(0, 15);
            const hover = await provider.provideHover(document, position);

            assert.strictEqual(hover, null);
        });
    });
});
