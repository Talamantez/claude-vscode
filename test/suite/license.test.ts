import * as assert from 'assert';
import { LicenseService } from '../../src/services/license-service';
import * as vscode from 'vscode';

suite('License Service Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let licenseService: LicenseService;
    let globalState: Map<string, any>;

    setup(() => {
        globalState = new Map<string, any>();
        mockContext = {
            globalState: {
                get: async (key: string) => globalState.get(key),
                update: async (key: string, value: any) => { globalState.set(key, value); return Promise.resolve(); }
            }
        } as any as vscode.ExtensionContext;

        licenseService = new LicenseService(mockContext);
    });

    test('New installation starts trial', async () => {
        await licenseService.initializeLicense();
        const license = await licenseService.getLicenseInfo();

        assert.ok(license, 'License should be created');
        assert.strictEqual(license?.isValid, true);
        assert.strictEqual(license?.isTrial, true);
        assert.ok(license?.trialEndsAt instanceof Date);
    });

    test('Trial expiration calculation', async () => {
        await licenseService.initializeLicense();
        const license = await licenseService.getLicenseInfo();

        assert.ok(license?.trialEndsAt);
        const daysUntilExpiry = Math.ceil((license!.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        assert.strictEqual(daysUntilExpiry, 7);
    });

    test('Full license activation', async () => {
        await licenseService.activateFullLicense();
        const license = await licenseService.getLicenseInfo();

        assert.ok(license);
        assert.strictEqual(license?.isValid, true);
        assert.strictEqual(license?.isTrial, false);
        assert.ok(license?.purchaseDate instanceof Date);
    });
});