import * as assert from 'assert';
import { PythonProvider } from '../../providers/pythonProvider';
import { beforeEach, describe, it, afterEach } from 'mocha';
import { TestHelper } from './testHelper';

describe('PythonProvider', () => {
    let provider: PythonProvider;

    beforeEach(() => {
        provider = new PythonProvider();
        TestHelper.setupMocks();
    });

    afterEach(() => {
        TestHelper.teardownMocks();
    });

    describe('parseRequirement', () => {
        it('should parse exact version requirement correctly', () => {
            const result = provider.parseRequirement('requests==2.31.0');
            assert.deepStrictEqual(result, {
                name: 'requests',
                currentVersion: '2.31.0',
            });
        });

        it('should parse greater than or equal version requirement correctly', () => {
            const result = provider.parseRequirement('django>=4.2.0');
            assert.deepStrictEqual(result, {
                name: 'django',
                currentVersion: '4.2.0',
            });
        });

        it('should parse compatible release version requirement correctly', () => {
            const result = provider.parseRequirement('numpy~=1.24.0');
            assert.deepStrictEqual(result, {
                name: 'numpy',
                currentVersion: '1.24.0',
            });
        });

        it('should handle package names with hyphens and underscores', () => {
            const result = provider.parseRequirement('python-dateutil==2.8.2');
            assert.deepStrictEqual(result, {
                name: 'python-dateutil',
                currentVersion: '2.8.2',
            });
        });

        it('should return null for invalid requirement lines', () => {
            assert.strictEqual(provider.parseRequirement('# comment line'), null);
            assert.strictEqual(provider.parseRequirement(''), null);
            assert.strictEqual(provider.parseRequirement('invalid-requirement'), null);
        });
    });

    describe('getLatestVersion', () => {
        it('should fetch latest version from PyPI', async () => {
            TestHelper.mockPyPIResponse('requests', '2.31.0');
            const result = await provider.getLatestVersion('requests');
            assert.strictEqual(result, '2.31.0');
        });

        it('should return empty string for non-existent package', async () => {
            TestHelper.mockApiError('https://pypi.org/pypi/non-existent-package-xyz/json');
            const result = await provider.getLatestVersion('non-existent-package-xyz');
            assert.strictEqual(result, '');
        });
    });

    describe('parsePyProjectTOML', () => {
        it('should parse main dependencies correctly', () => {
            const tomlContent = `
[project]
dependencies = [
    "fastapi>=0.110.0",
    "sqlalchemy>=2.0.0",
    "pydantic>=2.6.0"
]`;
            const result = provider.parsePyProjectTOML(tomlContent);
            assert.deepStrictEqual(result, [
                { name: 'fastapi', currentVersion: '0.110.0' },
                { name: 'sqlalchemy', currentVersion: '2.0.0' },
                { name: 'pydantic', currentVersion: '2.6.0' },
            ]);
        });

        it('should parse optional dependencies correctly', () => {
            const tomlContent = `
[project]
dependencies = ["fastapi>=0.110.0"]

[project.optional-dependencies]
test = [
    "pytest>=8.0.0",
    "pytest-cov>=4.1.0"
]`;
            const result = provider.parsePyProjectTOML(tomlContent);
            assert.deepStrictEqual(result, [
                { name: 'fastapi', currentVersion: '0.110.0' },
                { name: 'pytest', currentVersion: '8.0.0' },
                { name: 'pytest-cov', currentVersion: '4.1.0' },
            ]);
        });

        it('should handle invalid TOML content', () => {
            const result = provider.parsePyProjectTOML('invalid toml content');
            assert.deepStrictEqual(result, []);
        });

        it('should handle empty dependencies', () => {
            const tomlContent = `
[project]
name = "example-project"
version = "0.1.0"`;
            const result = provider.parsePyProjectTOML(tomlContent);
            assert.deepStrictEqual(result, []);
        });
    });
});
