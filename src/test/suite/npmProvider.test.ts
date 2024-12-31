import * as assert from 'assert';
import { NpmProvider } from '../../providers/npmProvider';
import { beforeEach, describe, it, afterEach } from 'mocha';
import { TestHelper } from './testHelper';

describe('NpmProvider', () => {
    let provider: NpmProvider;

    beforeEach(() => {
        provider = new NpmProvider();
        TestHelper.setupMocks();
    });

    afterEach(() => {
        TestHelper.teardownMocks();
    });

    describe('parsePackageJson', () => {
        it('should parse dependencies correctly', () => {
            provider.parsePackageJson('"dependencies": {');
            const result = provider.parsePackageJson('    "axios": "^1.5.0",');

            assert.deepStrictEqual(result, {
                name: 'axios',
                currentVersion: '1.5.0',
            });
        });

        it('should parse devDependencies correctly', () => {
            provider.parsePackageJson('"devDependencies": {');
            const result = provider.parsePackageJson('    "@types/node": "^20.8.0",');

            assert.deepStrictEqual(result, {
                name: '@types/node',
                currentVersion: '20.8.0',
            });
        });

        it('should return null for non-dependency lines', () => {
            const result = provider.parsePackageJson('  "name": "riched-version-lens",');
            assert.strictEqual(result, null);
        });

        it('should handle version specifiers correctly', () => {
            provider.parsePackageJson('"dependencies": {');
            const result = provider.parsePackageJson('    "semver": "~7.5.4",');

            assert.deepStrictEqual(result, {
                name: 'semver',
                currentVersion: '7.5.4',
            });
        });
    });

    describe('getLatestVersion', () => {
        it('should fetch latest version from npm registry', async () => {
            TestHelper.mockNpmResponse('axios', '1.6.0');
            const result = await provider.getLatestVersion('axios');
            assert.strictEqual(result, '1.6.0');
        });

        it('should return null for non-existent package', async () => {
            TestHelper.mockApiError('https://registry.npmjs.org/non-existent-package-xyz');
            const result = await provider.getLatestVersion('non-existent-package-xyz');
            assert.strictEqual(result, null);
        });
    });

    describe('reset', () => {
        it('should reset internal state', () => {
            provider.parsePackageJson('"dependencies": {');
            provider.reset();
            const result = provider.parsePackageJson('    "axios": "^1.5.0",');
            assert.strictEqual(result, null);
        });
    });
});
