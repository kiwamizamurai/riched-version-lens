import * as path from 'path';
import Mocha from 'mocha';
import * as glob from 'glob';

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
    });

    const testsRoot = path.resolve(__dirname, '.');

    try {
        // Use promisify to convert glob to promise-based
        const files = await new Promise<string[]>((resolve, reject) => {
            glob.glob('**/**.test.js', { cwd: testsRoot }, (err, matches) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(matches);
                }
            });
        });

        // Add files to the test suite
        files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

        return new Promise<void>((resolve, reject) => {
            try {
                // Run the mocha test
                mocha.run((failures: number) => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err: unknown) {
                reject(err instanceof Error ? err : new Error(String(err)));
            }
        });
    } catch (err: unknown) {
        throw err instanceof Error ? err : new Error(String(err));
    }
}
