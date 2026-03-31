import { describe, it, expect, vi } from 'vitest';
import { generateUniqueUsernameSuggestion } from '@/lib/server/username-suggestions';
import * as firebaseAdmin from '@/lib/server/firebase-admin';

// Mock the module
vi.mock('@/lib/server/firebase-admin', () => {
    return {
        adminDb: {
            collection: vi.fn(),
        }
    };
});

describe('generateUniqueUsernameSuggestion performance', () => {
    it('benchmark', async () => {
        const mockGet = vi.fn();
        const mockWhere = vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
                get: mockGet
            })
        });

        // Let's say all names are taken up to the 50th name
        let count = 0;
        mockGet.mockImplementation(async () => {
            // simulate 10ms network latency
            await new Promise(resolve => setTimeout(resolve, 10));
            count++;
            if (count >= 50) {
                return { empty: true }; // available
            }
            return { empty: false, docs: [{ id: 'other' }] }; // taken
        });

        // @ts-ignore
        firebaseAdmin.adminDb.collection.mockReturnValue({
            where: mockWhere
        });

        const start = Date.now();
        const result = await generateUniqueUsernameSuggestion({
            uid: '1234567890',
            preferredUsername: 'testuser',
        });
        const end = Date.now();

        console.log(`Time taken: ${end - start}ms, Checks made: ${count}, Result: ${result}`);
        expect(result).toBeDefined();
    });
});
