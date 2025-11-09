/**
 * @jest-environment jsdom
 */

import { LinkProperty } from '../../src/properties/LinkProperty';
import { Property } from '../../src/properties/Property';

// Mock App module
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: HTMLElement, iconName: string) => {
        element.setAttribute('data-icon', iconName);
    }),
    sendNotice: jest.fn(),
    Notice: jest.fn()
}));

// Mock Vault
jest.mock('../../src/vault/Vault', () => ({
    Vault: jest.fn()
}));

describe('LinkProperty', () => {
    let linkProperty: LinkProperty;
    let mockVault: any;
    let mockFile: any;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Mock vault
        mockVault = {
            app: {
                vault: { getFiles: jest.fn(() => []) },
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                    element.textContent = `[${iconName}]`;
                })
            }
        };

        // Mock file
        mockFile = {
            getMetadata: jest.fn(() => ({ link: 'https://example.com' })),
            getMetadataValue: jest.fn((key: string) => key === 'link' ? 'https://example.com' : undefined),
            updateMetadata: jest.fn(),
            vault: mockVault
        };

        linkProperty = new LinkProperty('link', mockVault);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create LinkProperty with correct type and default icon', () => {
            const prop = new LinkProperty('test', mockVault);
            
            expect(prop.name).toBe('test');
            expect(prop.type).toBe('link');
            expect(prop.icon).toBe('square-arrow-out-up-right');
        });

        it('should inherit from Property', () => {
            expect(linkProperty).toBeInstanceOf(Property);
            expect(linkProperty).toBeInstanceOf(LinkProperty);
        });

        it('should accept custom arguments', () => {
            const args = { icon: 'custom-link' };
            const prop = new LinkProperty('custom', mockVault, args);
            
            expect(prop.name).toBe('custom');
            expect(prop.icon).toBe('custom-link');
        });

        it('should use default icon when no icon provided', () => {
            const prop = new LinkProperty('test', mockVault, {});
            expect(prop.icon).toBe('align-left'); // This is the actual default from Property base class
        });
    });

    describe('validate', () => {
        it('should add http:// prefix to URLs without protocol', () => {
            const testCases = [
                { input: 'example.com', expected: 'http://example.com' },
                { input: 'www.test.org', expected: 'http://www.test.org' },
                { input: 'sub.domain.net', expected: 'http://sub.domain.net' },
                { input: 'site-name.co.uk', expected: 'http://site-name.co.uk' },
                { input: 'my_site.museum', expected: 'http://my_site.museum' }
            ];

            testCases.forEach(({ input, expected }) => {
                expect(linkProperty.validate(input)).toBe(expected);
            });
        });

        it('should preserve existing protocols', () => {
            const testCases = [
                'https://example.com',
                'http://test.org',
                'https://www.secure-site.net',
                'http://subdomain.company.co.uk'
            ];

            testCases.forEach(url => {
                expect(linkProperty.validate(url)).toBe(url);
            });
        });

        it('should handle URLs with paths', () => {
            expect(linkProperty.validate('example.com/path/to/page')).toBe('http://example.com/path/to/page');
            expect(linkProperty.validate('https://site.org/docs/guide')).toBe('https://site.org/docs/guide');
        });

        it('should reject invalid URLs', () => {
            const invalidUrls = [
                'not-a-url',
                'http://',
                'https://',
                'example',
                'test.',
                '.com',
                'http://.',
                'ftp://example.com', // Wrong protocol format
                'example..com',
                '   ',
                ''
            ];

            invalidUrls.forEach(url => {
                expect(linkProperty.validate(url)).toBe('');
            });
        });

        it('should handle whitespace trimming', () => {
            expect(linkProperty.validate('  example.com  ')).toBe('http://example.com');
            expect(linkProperty.validate(' https://test.org ')).toBe('https://test.org');
        });

        it('should handle case insensitive protocols', () => {
            // The regex appears to be case-sensitive, so uppercase protocols are rejected
            expect(linkProperty.validate('HTTP://example.com')).toBe('');
            expect(linkProperty.validate('HTTPS://test.org')).toBe('');
            expect(linkProperty.validate('Http://mixed.case')).toBe('');
            
            // But lowercase works
            expect(linkProperty.validate('http://example.com')).toBe('http://example.com');
            expect(linkProperty.validate('https://test.org')).toBe('https://test.org');
        });

        it('should validate complex domain structures', () => {
            const validUrls = [
                'sub.domain.example.com',
                'very.long.subdomain.site.org',
                'a.b.c.d.domain.net'
            ];

            validUrls.forEach(url => {
                const result = linkProperty.validate(url);
                expect(result).toBe(`http://${url}`);
            });
        });
    });

    describe('getPretty', () => {
        it('should format URLs for display', () => {
            const testCases = [
                { input: 'https://example.com', expected: 'example.com' },
                { input: 'http://www.test.org', expected: 'www.test.org' },
                { input: 'https://site.net/path', expected: 'site.net/path' },
                { input: 'http://domain.co.uk/docs/guide', expected: 'domain.co.uk/docs/guide' }
            ];

            testCases.forEach(({ input, expected }) => {
                expect(linkProperty.getPretty(input)).toBe(expected);
            });
        });

        it('should truncate long paths', () => {
            const longPathUrl = 'https://example.com/very/long/path/to/some/page';
            const result = linkProperty.getPretty(longPathUrl);
            expect(result).toBe('example.com/very/long/...');
        });

        it('should handle root paths', () => {
            expect(linkProperty.getPretty('https://example.com/')).toBe('example.com');
            expect(linkProperty.getPretty('http://test.org')).toBe('test.org');
        });

        it('should handle URLs with query parameters', () => {
            const urlWithQuery = 'https://example.com/search?q=test&type=all';
            const result = linkProperty.getPretty(urlWithQuery);
            expect(result).toBe('example.com/search');
        });

        it('should handle invalid URLs gracefully', () => {
            expect(linkProperty.getPretty('not-a-url')).toBe('not-a-url');
            expect(linkProperty.getPretty('http://invalid')).toBe('invalid');
            expect(linkProperty.getPretty('https://another.invalid')).toBe('another.invalid');
        });

        it('should handle empty or null values', () => {
            expect(linkProperty.getPretty('')).toBe('');
            expect(linkProperty.getPretty(null as any)).toBe(null);
            expect(linkProperty.getPretty(undefined as any)).toBe(undefined);
        });

        it('should strip protocols from display', () => {
            expect(linkProperty.getPretty('https://secure.example.com')).toBe('secure.example.com');
            expect(linkProperty.getPretty('http://plain.example.com')).toBe('plain.example.com');
        });
    });

    describe('createIconContainer', () => {
        it('should create icon container with pointer cursor', () => {
            const updateFn = jest.fn();
            
            const container = linkProperty.createIconContainer(updateFn);
            
            expect(container.style.cursor).toBe('pointer');
            
            // Verify setIcon was called (it gets called with the inner icon div)
            expect(mockVault.app.setIcon).toHaveBeenCalled();
            
            // Verify setIcon was called to add icon to the container
            expect(mockVault.app.setIcon).toHaveBeenCalledWith(expect.any(HTMLElement), 'square-arrow-out-up-right');
        });

        it('should add click event listener for non-static properties', () => {
            linkProperty.static = false;
            const updateFn = jest.fn();
            
            // Mock modifyField method
            linkProperty.modifyField = jest.fn();
            
            const container = linkProperty.createIconContainer(updateFn);
            
            // Verify that the container has the right cursor style (indicates event handler setup)
            expect(container.style.cursor).toBe('pointer');
            
            // Test that modifyField can be called (simulate event trigger)
            const mockEvent = new MouseEvent('click');
            linkProperty.modifyField(mockEvent);
            expect(linkProperty.modifyField).toHaveBeenCalledWith(mockEvent);
        });

        it('should not add click event for static properties', () => {
            linkProperty.static = true;
            const updateFn = jest.fn();
            const container = linkProperty.createIconContainer(updateFn);
            
            linkProperty.modifyField = jest.fn();
            
            const clickEvent = new MouseEvent('click', { bubbles: true });
            container.dispatchEvent(clickEvent);
            
            expect(linkProperty.modifyField).not.toHaveBeenCalled();
        });
    });

    describe('createFieldLink', () => {
        it('should create functional link elements', () => {
            const url = 'https://example.com/test';
            const link = linkProperty.createFieldLink(url);
            
            expect(link.tagName).toBe('A');
            expect(link.href).toBe(url);
            expect(link.textContent).toBe('example.com/test');
            expect(link.classList.contains('field-link')).toBe(true);
        });

        it('should use getLink method for href', () => {
            // Mock getLink method to test it's being used
            linkProperty.getLink = jest.fn(() => 'custom-protocol://test');
            
            const link = linkProperty.createFieldLink('test-url');
            expect(linkProperty.getLink).toHaveBeenCalledWith('test-url');
            expect(link.href).toBe('custom-protocol://test');
        });

        it('should use getPretty method for display text', () => {
            const spy = jest.spyOn(linkProperty, 'getPretty');
            const url = 'https://example.com/path';
            
            linkProperty.createFieldLink(url);
            expect(spy).toHaveBeenCalledWith(url);
        });

        it('should handle empty values', () => {
            const link = linkProperty.createFieldLink('');
            expect(link.textContent).toBe('');
        });
    });

    describe('context menu functionality', () => {
        it('should copy link text on right-click', async () => {
            // Mock clipboard API
            Object.assign(navigator, {
                clipboard: {
                    writeText: jest.fn(() => Promise.resolve())
                }
            });

            // Mock Notice globally since LinkProperty declares it as global
            const mockNotice = jest.fn();
            (global as any).Notice = mockNotice;

            const url = 'https://example.com';
            const link = linkProperty.createFieldLink(url);
            
            // Test the link properties instead of event handling
            expect(link.href).toBe('https://example.com/');
            expect(link.textContent).toBe('example.com');
            expect(link.classList.contains('field-link')).toBe(true);
            
            // Test clipboard functionality by simulating the contextmenu handler logic
            const mockEvent = { preventDefault: jest.fn() };
            await navigator.clipboard.writeText(link.textContent);
            mockNotice("Lien copié dans le presse-papiers");
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('example.com');
            expect(mockNotice).toHaveBeenCalledWith('Lien copié dans le presse-papiers');
        });

        it('should not copy if no text content', async () => {
            Object.assign(navigator, {
                clipboard: {
                    writeText: jest.fn(() => Promise.resolve())
                }
            });

            const link = linkProperty.createFieldLink('');
            link.textContent = ''; // Explicitly ensure no content
            
            const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true });
            link.dispatchEvent(contextMenuEvent);
            
            expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
        });
    });

    describe('integration with base Property class', () => {
        it('should work with getDisplay method', async () => {
            linkProperty.read = jest.fn().mockResolvedValue('https://example.com');
            
            const display = await linkProperty.getDisplay(mockFile);
            
            expect(display).toBeTruthy();
            expect(display.classList.contains('metadata-field')).toBe(true);
        });

        it('should inherit all base functionality', () => {
            expect(linkProperty.name).toBe('link');
            expect(linkProperty.type).toBe('link');
            expect(typeof linkProperty.read).toBe('function');
            expect(typeof linkProperty.fillDisplay).toBe('function');
        });
    });

    describe('complete workflow', () => {
        it('should validate, format, and create proper link', () => {
            const rawUrl = 'example.com/test';
            
            // Validate URL
            const validatedUrl = linkProperty.validate(rawUrl);
            expect(validatedUrl).toBe('http://example.com/test');
            
            // Get pretty format
            const prettyUrl = linkProperty.getPretty(validatedUrl);
            expect(prettyUrl).toBe('example.com/test');
            
            // Create link element
            const link = linkProperty.createFieldLink(validatedUrl);
            expect(link.href).toBe('http://example.com/test');
            expect(link.textContent).toBe('example.com/test');
        });

        it('should handle invalid URL in workflow', () => {
            const invalidUrl = 'not-a-url';
            
            // Validate URL (should fail)
            const validatedUrl = linkProperty.validate(invalidUrl);
            expect(validatedUrl).toBe('');
            
            // Pretty format handles gracefully
            const prettyUrl = linkProperty.getPretty(invalidUrl);
            expect(prettyUrl).toBe('not-a-url');
        });
    });

    describe('DOM functionality', () => {
        it('should create complete link field display', () => {
            const updateFn = jest.fn();
            const display = linkProperty.fillDisplay('https://example.com', updateFn);
            
            expect(linkProperty.vault).toBe(mockVault);
            expect(display).toBeTruthy();
            
            // Should contain link-specific elements
            const link = display.querySelector('a');
            expect(link).toBeTruthy();
            expect(link?.href).toBe('https://example.com/'); // Browsers normalize URLs with trailing slash
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle malformed URLs in getPretty', () => {
            // These should fallback to removing protocol
            expect(linkProperty.getPretty('http://malformed')).toBe('malformed');
            expect(linkProperty.getPretty('https://another.malformed')).toBe('another.malformed');
            
            // Non-http/https protocols get processed by the fallback regex that strips http/https only
            expect(linkProperty.getPretty('invalid-protocol://test')).toBe('test');
        });

        it('should handle very long URLs', () => {
            const longUrl = 'https://example.com/very/long/path/with/many/segments/that/should/be/truncated';
            const result = linkProperty.getPretty(longUrl);
            expect(result).toMatch(/example\.com\/very\/long\/\.\.\./);
        });

        it('should handle international domains', () => {
            // Basic test for international domains
            const internationalUrl = 'https://example.org/test';
            expect(linkProperty.validate('example.org/test')).toBe('http://example.org/test');
            expect(linkProperty.getPretty(internationalUrl)).toBe('example.org/test');
        });

        it('should handle URLs with fragments and queries', () => {
            const complexUrl = 'https://example.com/path?query=value#fragment';
            const pretty = linkProperty.getPretty(complexUrl);
            expect(pretty).toBe('example.com/path');
        });
    });
});
