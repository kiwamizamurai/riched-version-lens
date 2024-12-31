import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogConfig {
    enabled: boolean;
    level: LogLevel;
    showOnStartup: boolean;
    maxFileSize: number;
    logToFile: boolean;
    logFilePath: string;
}

class Logger {
    private outputChannel: vscode.OutputChannel;
    private config: LogConfig;
    private logFilePath?: string;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Riched Version Lens');
        this.config = this.loadConfig();

        // Initialize log file if enabled
        if (this.config.logToFile) {
            this.logFilePath = this.initializeLogFile();
        }

        // Show logs on startup if configured
        if (this.config.showOnStartup) {
            this.show();
        }

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('riched-version-lens.logging')) {
                this.config = this.loadConfig();
            }
        });
    }

    private loadConfig(): LogConfig {
        const config = vscode.workspace.getConfiguration('riched-version-lens.logging');
        return {
            enabled: config.get<boolean>('enabled', true),
            level: config.get<LogLevel>('level', 'info'),
            showOnStartup: config.get<boolean>('showOnStartup', true),
            maxFileSize: config.get<number>('maxFileSize', 5 * 1024 * 1024), // 5MB default
            logToFile: config.get<boolean>('logToFile', false),
            logFilePath: config.get<string>('logFilePath', ''),
        };
    }

    private initializeLogFile(): string {
        const logPath = this.config.logFilePath || path.join(this.getExtensionPath(), 'logs');

        if (!fs.existsSync(logPath)) {
            fs.mkdirSync(logPath, { recursive: true });
        }

        return path.join(logPath, 'riched-version-lens.log');
    }

    private getExtensionPath(): string {
        const extension = vscode.extensions.getExtension('kiwamizamurai.riched-version-lens');
        return extension ? extension.extensionPath : '';
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            this.log('DEBUG', message, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            this.log('INFO', message, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            this.log('WARN', message, ...args);
        }
    }

    error(message: string, error?: any, ...args: any[]): void {
        if (this.shouldLog('error')) {
            const errorDetails = error ? `\n${error.stack || error.message}` : '';
            this.log('ERROR', `${message}${errorDetails}`, ...args);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        if (!this.config.enabled) {
            return false;
        }

        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.config.level);
    }

    private log(level: string, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const formattedArgs = args
            .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg))
            .join(' ');

        const logMessage = `[${timestamp}] [${level}] ${message} ${formattedArgs}`.trim();

        // Output to VSCode channel
        this.outputChannel.appendLine(logMessage);

        // Output to file if enabled
        if (this.config.logToFile && this.logFilePath) {
            this.writeToFile(logMessage);
        }
    }

    private writeToFile(message: string): void {
        if (!this.logFilePath) {
            return;
        }
        try {
            // Check file size and rotate if needed
            this.rotateLogFileIfNeeded();

            // Append to log file
            fs.appendFileSync(this.logFilePath, message + '\n');
        } catch (error) {
            // Output to VSCode channel only if file writing fails
            this.outputChannel.appendLine(
                `[${new Date().toISOString()}] [ERROR] Failed to write to log file: ${error}`
            );
        }
    }

    private rotateLogFileIfNeeded(): void {
        if (!this.logFilePath) {
            return;
        }
        try {
            if (!fs.existsSync(this.logFilePath)) {
                return;
            }

            const stats = fs.statSync(this.logFilePath);
            if (stats.size >= this.config.maxFileSize) {
                const backupPath = `${this.logFilePath}.1`;
                if (fs.existsSync(backupPath)) {
                    fs.unlinkSync(backupPath);
                }
                fs.renameSync(this.logFilePath, backupPath);
            }
        } catch (error) {
            this.outputChannel.appendLine(`[${new Date().toISOString()}] [ERROR] Failed to rotate log file: ${error}`);
        }
    }

    show(): void {
        this.outputChannel.show();
    }

    dispose(): void {
        this.outputChannel.dispose();
    }
}

export const logger = new Logger();
