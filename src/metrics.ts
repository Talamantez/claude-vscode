// src/metrics.ts
import * as vscode from 'vscode';
import { getConfiguration } from './config';

export interface UsageMetrics {
    timestamp: string;
    operation: string;
    model: string;
    tokens_used: number;
    latency_ms: number;
    status: string;
    metadata?: Record<string, any>;
}

export interface UsageSummary {
    daily_tokens: number;
    monthly_tokens: number;
    remaining_quota: number;
    tier: string;
}

export interface QuotaInfo {
    tier: string;
    daily_limit: number;
    monthly_limit: number;
    features: string[];
}

export interface LicenseValidation {
    valid: boolean;
    tier: string;
    limits: {
        daily: number;
        monthly: number;
    };
    usage: {
        daily: number;
        monthly: number;
    };
    features: string[];
}

export class MetricsService {
    private static readonly METRICS_KEY = 'claude-vscode.metrics';
    private readonly _statusBarItem: vscode.StatusBarItem;
    private static readonly LICENSE_BASE_URL = 'https://conscious-robot.com/api/license';

    constructor(private readonly context: vscode.ExtensionContext) {
        this._statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this._statusBarItem.command = 'claude-vscode.showUsageSummary';
        this.context.subscriptions.push(this._statusBarItem);
    }

    private async validateLicense(): Promise<LicenseValidation | null> {
        const config = getConfiguration();
        try {
            const response = await fetch(`${MetricsService.LICENSE_BASE_URL}/${config.apiKey}`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            if (this.isLicenseValidation(data)) {
                return data;
            }
            return null;
        } catch (error) {
            console.warn('License validation failed:', error);
            return null;
        }
    }

    private isLicenseValidation(data: any): data is LicenseValidation {
        return (
            data &&
            typeof data.valid === 'boolean' &&
            typeof data.tier === 'string' &&
            data.limits &&
            typeof data.limits.daily === 'number' &&
            typeof data.limits.monthly === 'number'
        );
    }

    public async logUsage(metrics: UsageMetrics): Promise<void> {
        try {
            const config = getConfiguration();
            if (!config.apiKey) {
                return;
            }

            // First validate license
            const licenseValidation = await this.validateLicense();
            if (!licenseValidation?.valid) {
                vscode.window.showErrorMessage('Your license is invalid or expired. Please update your API key.');
                return;
            }

            // Check if we're within limits
            if (licenseValidation.limits.daily > 0 &&
                licenseValidation.usage.daily + metrics.tokens_used > licenseValidation.limits.daily) {
                vscode.window.showErrorMessage('Daily usage limit exceeded. Please upgrade your plan.');
                return;
            }

            // Log metrics to API
            const metricsResponse = await fetch(`${config.apiUrl}/metrics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': config.apiKey
                },
                body: JSON.stringify(metrics)
            });

            if (!metricsResponse.ok) {
                console.warn('Failed to log metrics:', await metricsResponse.text());
                return;
            }

            // Update license usage
            await fetch(`${MetricsService.LICENSE_BASE_URL}/${config.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tokens: metrics.tokens_used
                })
            });

            // Update local cache
            await this.updateLocalMetrics(metrics);

            // Update status bar
            await this.updateStatusBar();

        } catch (error) {
            console.warn('Error logging metrics:', error);
            // Non-blocking - we don't want metrics failures to affect the user
        }
    }

    private async updateLocalMetrics(metrics: UsageMetrics): Promise<void> {
        const currentDate = new Date().toISOString().split('T')[0];
        const storedMetrics = await this.context.globalState.get<Record<string, number>>(MetricsService.METRICS_KEY) || {};

        // Update daily usage
        storedMetrics[currentDate] = (storedMetrics[currentDate] || 0) + metrics.tokens_used;

        // Clean up old metrics (keep only last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const cleanedMetrics = Object.entries(storedMetrics)
            .filter(([date]) => date >= thirtyDaysAgoStr)
            .reduce((acc, [date, value]) => ({ ...acc, [date]: value }), {});

        await this.context.globalState.update(MetricsService.METRICS_KEY, cleanedMetrics);
    }

    public async getUsageSummary(): Promise<UsageSummary> {
        const licenseValidation = await this.validateLicense();
        if (!licenseValidation) {
            throw new Error('License validation failed');
        }

        return {
            daily_tokens: licenseValidation.usage.daily,
            monthly_tokens: licenseValidation.usage.monthly,
            remaining_quota: licenseValidation.limits.daily - licenseValidation.usage.daily,
            tier: licenseValidation.tier
        };
    }
    public async getPricingTiers(): Promise<Record<string, QuotaInfo>> {
        const response = await fetch(`${MetricsService.LICENSE_BASE_URL}/tiers`);
        if (!response.ok) {
            throw new Error('Failed to get pricing tiers');
        }
        const data = await response.json();
        if (this.isQuotaInfoRecord(data)) {
            return data;
        }
        throw new Error('Invalid pricing tiers response format');
    }

    private isQuotaInfoRecord(data: unknown): data is Record<string, QuotaInfo> {
        if (!data || typeof data !== 'object') {
            return false;
        }

        return Object.entries(data).every(([_, tierData]) => {
            if (!tierData || typeof tierData !== 'object') {
                return false;
            }

            const quota = tierData as Partial<QuotaInfo>;
            return (
                typeof quota.tier === 'string' &&
                typeof quota.daily_limit === 'number' &&
                typeof quota.monthly_limit === 'number' &&
                Array.isArray(quota.features)
            );
        });
    }

    private async updateStatusBar(): Promise<void> {
        try {
            const summary = await this.getUsageSummary();
            this._statusBarItem.text = `$(graph) ${summary.daily_tokens} today | ${summary.tier}`;
            this._statusBarItem.tooltip = `Monthly usage: ${summary.monthly_tokens}\nRemaining: ${summary.remaining_quota}\nTier: ${summary.tier}`;
            this._statusBarItem.show();
        } catch (error) {
            this._statusBarItem.hide();
        }
    }

    public async showUsageSummaryCommand(): Promise<void> {
        try {
            const summary = await this.getUsageSummary();
            const tiers = await this.getPricingTiers();
            const currentTier = tiers[summary.tier];

            const message = [
                `Current Tier: ${summary.tier}`,
                `Daily Usage: ${summary.daily_tokens} / ${currentTier.daily_limit}`,
                `Monthly Usage: ${summary.monthly_tokens} / ${currentTier.monthly_limit}`,
                `Features: ${currentTier.features.join(', ')}`
            ].join('\n');

            const actions = ['View Pricing Tiers', 'Close'];
            const selected = await vscode.window.showInformationMessage(message, ...actions);

            if (selected === 'View Pricing Tiers') {
                await this.showPricingTiers();
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to get usage summary');
        }
    }

    private async showPricingTiers(): Promise<void> {
        try {
            const tiers = await this.getPricingTiers();
            const tiersList = Object.entries(tiers)
                .map(([name, info]) => (
                    `${name.toUpperCase()}\n` +
                    `• Daily Limit: ${info.daily_limit}\n` +
                    `• Monthly Limit: ${info.monthly_limit}\n` +
                    `• Features: ${info.features.join(', ')}`
                ))
                .join('\n\n');

            const actions = ['Upgrade', 'Close'];
            const selected = await vscode.window.showInformationMessage(tiersList, ...actions);

            if (selected === 'Upgrade') {
                vscode.env.openExternal(vscode.Uri.parse('https://conscious-robot.com/pricing'));
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to get pricing information');
        }
    }

    public dispose(): void {
        this._statusBarItem.dispose();
    }
}