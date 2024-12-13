// src/services/api-service.ts
import { getConfiguration } from '../config';

interface ArchitectureResponse {
    detected_framework: string;
    confidence: number;
    markers: string[];
    warnings?: string[];
    tier?: string;
    remaining_quota?: number;
}

interface LicenseValidation {
    valid: boolean;
    tier: string;
    limits: {
        daily: number;
        monthly: number;
    };
}

interface Quota {
    daily_limit: number;
    monthly_limit: number;
    remaining_quota: number;
    tier: string;
}

export class ApiService {
    private readonly baseUrl = 'https://your-railway-app.up.railway.app';
    private readonly licenseUrl = 'https://conscious-robot.com/api';

    private async getHeaders(): Promise<Headers> {
        const config = getConfiguration();
        return new Headers({
            'Content-Type': 'application/json',
            'api-key': config.apiKey || ''
        });
    }

    public async validateLicense(): Promise<boolean> {
        try {
            const config = getConfiguration();
            const response = await fetch(`${this.licenseUrl}/license/${config.apiKey}`);
            if (!response.ok) return false;

            const data = await response.json() as LicenseValidation;
            return data.valid === true;
        } catch (error) {
            console.error('License validation failed:', error);
            return false;
        }
    }

    public async trackUsage(tokens: number): Promise<void> {
        try {
            const config = getConfiguration();
            await fetch(`${this.licenseUrl}/license/${config.apiKey}`, {
                method: 'POST',
                headers: await this.getHeaders(),
                body: JSON.stringify({ tokens })
            });
        } catch (error) {
            console.warn('Usage tracking failed:', error);
        }
    }

    public async detectArchitecture(files: string[], directories: string[]): Promise<ArchitectureResponse> {
        const response = await fetch(`${this.baseUrl}/detect`, {
            method: 'POST',
            headers: await this.getHeaders(),
            body: JSON.stringify({
                files,
                directories,
                config_files: {} // Add config files if needed
            })
        });

        if (!response.ok) {
            throw new Error(`Architecture detection failed: ${response.statusText}`);
        }

        return response.json() as Promise<ArchitectureResponse>;
    }

    public async getQuota(): Promise<{
        daily_limit: number;
        monthly_limit: number;
        remaining_quota: number;
        tier: string;
    }> {
        const response = await fetch(`${this.baseUrl}/quota`, {
            headers: await this.getHeaders()
        });

        if (!response.ok) {
            throw new Error(`Failed to get quota: ${response.statusText}`);
        }

        return response.json() as Promise<Quota>;
    }
}