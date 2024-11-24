import * as vscode from 'vscode';

export interface LicenseInfo {
    isValid: boolean;
    isTrial: boolean;
    trialEndsAt?: Date;
    purchaseDate?: Date;
}

export class LicenseService {
    private static readonly LICENSE_KEY = 'claude-vscode.license';
    private static readonly TRIAL_KEY = 'claude-vscode.trial';

    constructor(private readonly context: vscode.ExtensionContext) { }

    public async initializeLicense(): Promise<void> {
        const license = await this.getLicenseInfo();

        if (!license) {
            // New installation - start trial
            await this.startTrial();
        } else if (license.isTrial && license.trialEndsAt) {
            // Check if trial has expired
            if (new Date() > license.trialEndsAt) {
                await this.expireTrial();
            }
        }
    }

    public async getLicenseInfo(): Promise<LicenseInfo | undefined> {
        const licenseData = await this.context.globalState.get<string>(LicenseService.LICENSE_KEY);
        if (!licenseData) {
            return undefined;
        }

        try {
            const parsed = JSON.parse(licenseData);
            // Convert date strings back to Date objects
            if (parsed.trialEndsAt) {
                parsed.trialEndsAt = new Date(parsed.trialEndsAt);
            }
            if (parsed.purchaseDate) {
                parsed.purchaseDate = new Date(parsed.purchaseDate);
            }
            return parsed as LicenseInfo;
        } catch {
            return undefined;
        }
    }

    private async startTrial(): Promise<void> {
        const trialInfo: LicenseInfo = {
            isValid: true,
            isTrial: true,
            trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        };

        await this.context.globalState.update(LicenseService.LICENSE_KEY, JSON.stringify(trialInfo));
        await this.context.globalState.update(LicenseService.TRIAL_KEY, true);
    }

    private async expireTrial(): Promise<void> {
        const expiredInfo: LicenseInfo = {
            isValid: false,
            isTrial: true,
            trialEndsAt: new Date()
        };

        await this.context.globalState.update(LicenseService.LICENSE_KEY, JSON.stringify(expiredInfo));
    }

    public async activateFullLicense(): Promise<void> {
        const licenseInfo: LicenseInfo = {
            isValid: true,
            isTrial: false,
            purchaseDate: new Date()
        };

        await this.context.globalState.update(LicenseService.LICENSE_KEY, JSON.stringify(licenseInfo));
        await this.context.globalState.update(LicenseService.TRIAL_KEY, false);
    }

    public async showLicenseStatus(): Promise<void> {
        const license = await this.getLicenseInfo();

        if (!license) {
            vscode.window.showInformationMessage(
                'Welcome to Claude AI Assistant Pro! Starting your 7-day free trial.'
            );
            return;
        }

        if (license.isTrial && license.trialEndsAt) {
            const daysLeft = Math.max(0, Math.ceil((license.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

            if (daysLeft > 0) {
                vscode.window.showInformationMessage(
                    `Trial Version: ${daysLeft} days remaining. Purchase to unlock full version.`,
                    'Purchase Now'
                ).then(selection => {
                    if (selection === 'Purchase Now') {
                        vscode.env.openExternal(vscode.Uri.parse(
                            'https://marketplace.visualstudio.com/items?itemName=conscious-robot.claude-vscode-assistant'
                        ));
                    }
                });
            } else {
                vscode.window.showWarningMessage(
                    'Your trial has expired. Please purchase to continue using Claude AI Assistant Pro.',
                    'Purchase Now'
                ).then(selection => {
                    if (selection === 'Purchase Now') {
                        vscode.env.openExternal(vscode.Uri.parse(
                            'https://marketplace.visualstudio.com/items?itemName=conscious-robot.claude-vscode-assistant'
                        ));
                    }
                });
            }
        }
    }

    public async validateLicense(): Promise<boolean> {
        const license = await this.getLicenseInfo();

        if (!license) {
            return false;
        }

        if (license.isTrial && license.trialEndsAt) {
            return new Date() <= license.trialEndsAt;
        }

        return license.isValid;
    }
}