export type SupportedFileType = 'requirements.txt' | 'package.json' | 'Gemfile' | 'pyproject.toml';

export interface VersionInfo {
    name: string;
    currentVersion: string;
    latestVersion?: string;
}

export interface FileProcessor {
    processLine(line: string): Promise<VersionInfo | null>;
    processEntireFile?(): Promise<VersionInfo[]>;
    setFileType?(fileType: string): void;
    reset(): void;
}
