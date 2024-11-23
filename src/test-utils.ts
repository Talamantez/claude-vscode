// src/test-utils.ts
import * as vscode from 'vscode';
import { waitForExtensionReady } from './utils';

export interface CleanupOptions {
    timeout?: number;
    retryDelay?: number;
    maxRetries?: number;
}

const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
    timeout: 1000,
    retryDelay: 100,
    maxRetries: 3
};

/**
 * Thorough cleanup of VS Code resources
 */
export async function thoroughCleanup(options: CleanupOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_CLEANUP_OPTIONS, ...options };
    const startTime = Date.now();

    // First attempt normal cleanup
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    await waitForExtensionReady(opts.retryDelay);

    for (let attempt = 0; attempt < opts.maxRetries!; attempt++) {
        if (Date.now() - startTime > opts.timeout!) {
            console.warn('Cleanup timeout reached');
            break;
        }

        // Force close any remaining editors
        if (vscode.window.visibleTextEditors.length > 0) {
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
            await waitForExtensionReady(opts.retryDelay);
        }

        // Explicit disposal of tab resources
        vscode.window.tabGroups.all.forEach(group => {
            group.tabs.forEach(tab => {
                try {
                    if (tab.input && typeof tab.input === 'object' && 'dispose' in tab.input) {
                        (tab.input as { dispose: () => void }).dispose();
                    }
                } catch (error) {
                    console.warn('Tab disposal error:', error);
                }
            });
        });

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        // Break if everything is cleaned up
        if (vscode.window.visibleTextEditors.length === 0 &&
            vscode.window.tabGroups.all.every(group => group.tabs.length === 0)) {
            break;
        }

        await waitForExtensionReady(opts.retryDelay);
    }
}