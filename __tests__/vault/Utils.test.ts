import { waitForFileMetaDataUpdate, waitForMetaDataCacheUpdate } from '../../src/vault/Utils';

// Create a simple mock app with jest functions
const createMockApp = () => ({
    getFile: jest.fn(),
    getMetadata: jest.fn(),
});

describe('Utils', () => {
    let mockApp: ReturnType<typeof createMockApp>;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        mockApp = createMockApp();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('waitForFileMetaDataUpdate', () => {
        const mockFile = {
            name: 'test.md',
            path: 'test/test.md',
            basename: 'test',
            extension: 'md'
        };

        it('should execute callback immediately when metadata key exists', async () => {
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue({ testKey: 'testValue' });
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', 'testKey', mockCallback);
            
            // Fast-forward timers to complete the function
            await jest.runAllTimersAsync();
            await promise;

            expect(mockApp.getFile).toHaveBeenCalledWith('test/test.md');
            expect(mockApp.getMetadata).toHaveBeenCalledWith(mockFile);
            expect(mockCallback).toHaveBeenCalled();
        });

        it('should wait and retry when metadata key does not exist initially', async () => {
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata
                .mockResolvedValueOnce({ otherKey: 'otherValue' })
                .mockResolvedValueOnce({ otherKey: 'otherValue' })
                .mockResolvedValueOnce({ testKey: 'testValue', otherKey: 'otherValue' });
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', 'testKey', mockCallback);
            
            await jest.runAllTimersAsync();
            await promise;

            expect(mockApp.getFile).toHaveBeenCalledTimes(3);
            expect(mockApp.getMetadata).toHaveBeenCalledTimes(3);
            expect(mockCallback).toHaveBeenCalled();
        });

        it('should execute callback after max attempts even if key not found', async () => {
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue({ otherKey: 'otherValue' });
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', 'testKey', mockCallback);
            
            await jest.runAllTimersAsync();
            await promise;

            expect(mockApp.getFile).toHaveBeenCalledTimes(50);
            expect(mockCallback).toHaveBeenCalled();
        });

        it('should execute callback when file not found', async () => {
            mockApp.getFile.mockResolvedValue(null);
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'nonexistent.md', 'testKey', mockCallback);
            
            await jest.runAllTimersAsync();
            await promise;

            expect(mockApp.getFile).toHaveBeenCalledTimes(50);
            expect(mockCallback).toHaveBeenCalled();
        });

        it('should execute callback when metadata is null', async () => {
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue(null);
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', 'testKey', mockCallback);
            
            await jest.runAllTimersAsync();
            await promise;

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should handle callback errors', async () => {
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue({ testKey: 'testValue' });
            
            const mockCallback = jest.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', 'testKey', mockCallback);
            
            await jest.runAllTimersAsync();
            
            // The function should handle the error internally, so we just check it was called
            expect(mockCallback).toHaveBeenCalled();
            await promise; // Should resolve without throwing
        });

        it('should handle app.getFile errors gracefully', async () => {
            mockApp.getFile.mockRejectedValue(new Error('File access error'));
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', 'testKey', mockCallback);
            
            await jest.runAllTimersAsync();
            
            // Should handle the error gracefully and still call callback
            await expect(promise).resolves.not.toThrow();
        });

        it('should work with different key types', async () => {
            mockApp.getFile.mockResolvedValue(mockFile);
            
            const testCases = [
                { key: 'stringKey', metadata: { stringKey: 'value' } },
                { key: 'numberKey', metadata: { numberKey: 42 } },
                { key: 'booleanKey', metadata: { booleanKey: false } },
                { key: 'nullKey', metadata: { nullKey: null } }
            ];

            for (const testCase of testCases) {
                mockApp.getMetadata.mockResolvedValue(testCase.metadata);
                const mockCallback = jest.fn().mockResolvedValue(undefined);

                await waitForFileMetaDataUpdate(mockApp as any, 'test/test.md', testCase.key, mockCallback);

                expect(mockCallback).toHaveBeenCalled();
                mockCallback.mockClear();
            }
        });
    });

    describe('waitForMetaDataCacheUpdate', () => {
        it('should execute callback after short delay', async () => {
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            const promise = waitForMetaDataCacheUpdate(mockApp as any, mockCallback);
            
            jest.advanceTimersByTime(100);
            await Promise.resolve();
            
            await promise;

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should handle callback errors', async () => {
            const mockCallback = jest.fn().mockRejectedValue(new Error('Cache callback error'));

            const promise = waitForMetaDataCacheUpdate(mockApp as any, mockCallback);
            
            jest.advanceTimersByTime(100);
            await Promise.resolve();

            await expect(promise).rejects.toThrow('Cache callback error');
        });

        it('should work with multiple concurrent calls', async () => {
            const mockCallback1 = jest.fn().mockResolvedValue('result1');
            const mockCallback2 = jest.fn().mockResolvedValue('result2');

            const promises = [
                waitForMetaDataCacheUpdate(mockApp as any, mockCallback1),
                waitForMetaDataCacheUpdate(mockApp as any, mockCallback2)
            ];
            
            jest.advanceTimersByTime(100);
            await Promise.resolve();

            await Promise.all(promises);

            expect(mockCallback1).toHaveBeenCalled();
            expect(mockCallback2).toHaveBeenCalled();
        });
    });

    describe('Edge cases', () => {
        it('should handle long file paths', async () => {
            const longPath = 'a/'.repeat(100) + 'file.md';
            const mockFile = { name: 'file.md', path: longPath, basename: 'file', extension: 'md' };
            
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue({ testKey: 'value' });
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            await waitForFileMetaDataUpdate(mockApp as any, longPath, 'testKey', mockCallback);

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should handle special characters', async () => {
            const specialPath = 'folder/test@#$%^&*().md';
            const mockFile = { name: 'test@#$%^&*().md', path: specialPath, basename: 'test@#$%^&*()', extension: 'md' };
            
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue({ testKey: 'value' });
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            await waitForFileMetaDataUpdate(mockApp as any, specialPath, 'testKey', mockCallback);

            expect(mockCallback).toHaveBeenCalled();
        });

        it('should handle empty string as key', async () => {
            const mockFile = { name: 'test.md', path: 'test.md', basename: 'test', extension: 'md' };
            
            mockApp.getFile.mockResolvedValue(mockFile);
            mockApp.getMetadata.mockResolvedValue({ '': 'emptyKeyValue' });
            
            const mockCallback = jest.fn().mockResolvedValue(undefined);

            await waitForFileMetaDataUpdate(mockApp as any, 'test.md', '', mockCallback);

            expect(mockCallback).toHaveBeenCalled();
        });
    });
});