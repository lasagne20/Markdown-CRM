import { Vault } from '../../src/vault/Vault';
import { FileProperty } from '../../src/properties/FileProperty';

describe('FileProperty.validateSingleFileLink', () => {
    let vault: jest.Mocked<Vault>;

    beforeEach(() => {
        vault = {
            getFromLink: jest.fn()
        } as any;
    });

    it('should return null for valid unchanged links', async () => {
        // Mock file found with same name
        vault.getFromLink.mockResolvedValue({
            getFile: () => ({
                getPath: () => '/vault/files/TestFile.md'
            })
        } as any);

        const result = await FileProperty.validateSingleFileLink(vault, '[[TestFile]]');
        expect(result).toBeNull(); // No change needed
    });

    it('should return updated link when file name changed', async () => {
        // Mock file found with different name
        vault.getFromLink.mockResolvedValue({
            getFile: () => ({
                getPath: () => '/vault/files/RenamedFile.md'
            })
        } as any);

        const result = await FileProperty.validateSingleFileLink(vault, '[[OldName]]');
        expect(result).toBe('[[RenamedFile]]'); // Updated name
    });

    it('should return undefined for non-existent files', async () => {
        // Mock file not found
        vault.getFromLink.mockResolvedValue(null);

        const result = await FileProperty.validateSingleFileLink(vault, '[[NonExistent]]');
        expect(result).toBeUndefined(); // Should be removed
    });

    it('should return undefined for invalid inputs', async () => {
        expect(await FileProperty.validateSingleFileLink(vault, null)).toBeUndefined();
        expect(await FileProperty.validateSingleFileLink(vault, undefined)).toBeUndefined();
        expect(await FileProperty.validateSingleFileLink(vault, 123)).toBeUndefined();
        expect(await FileProperty.validateSingleFileLink(vault, '')).toBeUndefined();
    });

    it('should handle vault errors gracefully', async () => {
        // Mock vault throwing error
        vault.getFromLink.mockRejectedValue(new Error('Vault error'));

        const result = await FileProperty.validateSingleFileLink(vault, '[[TestFile]]');
        expect(result).toBeUndefined(); // Error should result in removal
    });
});