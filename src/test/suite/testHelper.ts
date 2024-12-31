import axios from 'axios';
import { SinonStub } from 'sinon';
import * as sinon from 'sinon';
import * as changelogFetcher from '../../utils/changelogFetcher';

export class TestHelper {
    private static axiosGetStub: SinonStub;
    private static fetchChangelogStub: SinonStub;

    static setupMocks() {
        this.axiosGetStub = sinon.stub(axios, 'get');
        this.fetchChangelogStub = sinon.stub(changelogFetcher, 'fetchChangelog');
    }

    static teardownMocks() {
        this.axiosGetStub.restore();
        this.fetchChangelogStub.restore();
    }

    static mockNpmResponse(packageName: string, version: string) {
        this.axiosGetStub.withArgs(`https://registry.npmjs.org/${packageName}`).resolves({
            data: {
                'dist-tags': {
                    latest: version,
                },
            },
        });
    }

    static mockPyPIResponse(packageName: string, version: string) {
        this.axiosGetStub.withArgs(`https://pypi.org/pypi/${packageName}/json`).resolves({
            data: {
                info: {
                    version: version,
                },
            },
        });
    }

    static mockApiError(url: string) {
        this.axiosGetStub.withArgs(url).rejects(new Error('API Error'));
    }

    static mockChangelog(packageName: string, version: string, changelog: string) {
        this.fetchChangelogStub.withArgs(packageName, version, sinon.match.any).resolves(changelog);
    }

    static mockChangelogError(packageName: string, version: string) {
        this.fetchChangelogStub.withArgs(packageName, version).rejects(new Error('Changelog fetch error'));
    }
}
