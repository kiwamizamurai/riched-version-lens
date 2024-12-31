import * as assert from 'assert';
import * as vscode from 'vscode';
import { MarkerProvider, UpdateNeededInfo } from '../../core/markerProvider';

suite('MarkerProvider Test Suite', () => {
    let markerProvider: MarkerProvider;
    let mockEditor: vscode.TextEditor;
    let decorations: Map<vscode.TextEditorDecorationType, vscode.Range[]>;

    setup(() => {
        markerProvider = new MarkerProvider();
        decorations = new Map();

        // Mock TextEditor
        mockEditor = {
            setDecorations: (decorationType: vscode.TextEditorDecorationType, ranges: vscode.Range[]) => {
                decorations.set(decorationType, ranges);
            },
        } as any;
    });

    teardown(() => {
        markerProvider.dispose();
        decorations.clear();
    });

    test('should create up-to-date decorations', () => {
        const range = new vscode.Range(0, 0, 0, 10);
        const upToDateRanges = [range];
        const updateNeededInfos: UpdateNeededInfo[] = [];

        markerProvider.updateDecorations(mockEditor, upToDateRanges, updateNeededInfos);

        // Verify that decorations were set
        assert.strictEqual(decorations.size, 1);
        const decorationEntries = Array.from(decorations.entries());
        assert.deepStrictEqual(decorationEntries[0][1], upToDateRanges);
    });

    test('should create update-needed decorations', () => {
        const range = new vscode.Range(0, 0, 0, 10);
        const upToDateRanges: vscode.Range[] = [];
        const updateNeededInfos: UpdateNeededInfo[] = [
            {
                range,
                latestVersion: '2.0.0',
            },
        ];

        markerProvider.updateDecorations(mockEditor, upToDateRanges, updateNeededInfos);

        // Verify that decorations were set
        assert.strictEqual(decorations.size, 2); // One for up-to-date and one for update-needed
        const hasUpdateNeededDecoration = Array.from(decorations.entries()).some(
            ([_, ranges]) => ranges.length === 1 && ranges[0] === range
        );
        assert.ok(hasUpdateNeededDecoration);
    });

    test('should group update-needed decorations by version', () => {
        const range1 = new vscode.Range(0, 0, 0, 10);
        const range2 = new vscode.Range(1, 0, 1, 10);
        const range3 = new vscode.Range(2, 0, 2, 10);
        const updateNeededInfos: UpdateNeededInfo[] = [
            { range: range1, latestVersion: '2.0.0' },
            { range: range2, latestVersion: '2.0.0' },
            { range: range3, latestVersion: '3.0.0' },
        ];

        markerProvider.updateDecorations(mockEditor, [], updateNeededInfos);

        // Verify that decorations were grouped correctly
        assert.strictEqual(decorations.size, 3); // One for up-to-date and two for different versions
        const decorationEntries = Array.from(decorations.entries());
        const versionGroups = decorationEntries
            .filter(([_, ranges]) => ranges.length > 0)
            .map(([_, ranges]) => ranges.length);

        assert.deepStrictEqual(versionGroups.sort(), [1, 2]);
    });

    test('should clear all decorations', () => {
        const range = new vscode.Range(0, 0, 0, 10);
        const updateNeededInfos: UpdateNeededInfo[] = [
            {
                range,
                latestVersion: '2.0.0',
            },
        ];

        markerProvider.updateDecorations(mockEditor, [range], updateNeededInfos);
        assert.ok(decorations.size > 0);

        markerProvider.clearDecorations(mockEditor);

        // Verify that all decorations were cleared
        const hasNonEmptyRanges = Array.from(decorations.values()).some((ranges) => ranges.length > 0);
        assert.ok(!hasNonEmptyRanges);
    });

    test('should dispose all decorations', () => {
        let disposeCalled = 0;
        const mockDecorationType = {
            dispose: () => {
                disposeCalled++;
            },
        } as any;

        // Add some mock decorations
        decorations.set(mockDecorationType, [new vscode.Range(0, 0, 0, 10)]);
        (markerProvider as any).updateNeededDecorations = [mockDecorationType];
        (markerProvider as any).upToDateDecoration = mockDecorationType;

        markerProvider.dispose();

        // Verify that dispose was called for all decorations
        assert.strictEqual(disposeCalled, 2);
    });
});
