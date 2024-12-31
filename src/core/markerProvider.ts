import * as vscode from 'vscode';

export interface UpdateNeededInfo {
    range: vscode.Range;
    latestVersion: string;
}

export class MarkerProvider {
    private upToDateDecoration: vscode.TextEditorDecorationType;
    private updateNeededDecorations: vscode.TextEditorDecorationType[];

    constructor() {
        this.upToDateDecoration = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: ' ✅',
                color: '#4CAF50',
            },
        });
        this.updateNeededDecorations = [];
    }

    private createUpdateNeededDecoration(latestVersion: string): vscode.TextEditorDecorationType {
        return vscode.window.createTextEditorDecorationType({
            after: {
                contentText: ` 🆙 ${latestVersion}`,
                color: '#FFA500',
            },
        });
    }

    public updateDecorations(
        editor: vscode.TextEditor,
        upToDateRanges: vscode.Range[],
        updateNeededInfos: UpdateNeededInfo[]
    ): void {
        editor.setDecorations(this.upToDateDecoration, upToDateRanges);

        // Clear all previous update needed decorations
        this.updateNeededDecorations.forEach((decoration) => {
            decoration.dispose();
            editor.setDecorations(decoration, []);
        });
        this.updateNeededDecorations = [];

        // Group ranges by latest version
        const groupedByVersion = new Map<string, vscode.Range[]>();
        updateNeededInfos.forEach((info) => {
            const ranges = groupedByVersion.get(info.latestVersion) || [];
            ranges.push(info.range);
            groupedByVersion.set(info.latestVersion, ranges);
        });

        // Create and apply decorations for each version
        groupedByVersion.forEach((ranges, latestVersion) => {
            const decoration = this.createUpdateNeededDecoration(latestVersion);
            editor.setDecorations(decoration, ranges);
            this.updateNeededDecorations.push(decoration);
        });
    }

    public clearDecorations(editor: vscode.TextEditor): void {
        editor.setDecorations(this.upToDateDecoration, []);
        this.updateNeededDecorations.forEach((decoration) => {
            editor.setDecorations(decoration, []);
            decoration.dispose();
        });
        this.updateNeededDecorations = [];
    }

    public dispose(): void {
        this.upToDateDecoration.dispose();
        this.updateNeededDecorations.forEach((decoration) => decoration.dispose());
        this.updateNeededDecorations = [];
    }
}
