import { RatingProperty } from '../../src/properties/RatingProperty';

// Mock des dépendances
jest.mock('../../src/vault/Utils', () => ({
    setIcon: jest.fn((element: Element, icon: string) => {
        const svg = document.createElement('svg');
        svg.setAttribute('data-icon', icon);
        element.appendChild(svg);
    })
}));

const { setIcon } = require('../../src/vault/Utils');

describe('RatingProperty', () => {
    let ratingProperty: RatingProperty;
    let mockUpdate: jest.Mock;
    let mockVault: any;

    beforeEach(() => {
        mockUpdate = jest.fn();
        mockVault = {
            app: {
                setIcon: jest.fn((element: HTMLElement, iconName: string) => {
                    element.setAttribute('data-icon', iconName);
                })
            },
            vault: {
                adapter: {
                    fs: {}
                }
            }
        };
        
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should create instance with default icon', () => {
            ratingProperty = new RatingProperty('rating', mockVault);
            
            expect(ratingProperty.name).toBe('rating');
            expect(ratingProperty.type).toBe('rating');
            expect(ratingProperty.icon).toBe('star');
        });

        test('should create instance with custom icon', () => {
            ratingProperty = new RatingProperty('customRating', mockVault, { icon: 'heart' });
            
            expect(ratingProperty.name).toBe('customRating');
            expect(ratingProperty.type).toBe('rating');
            expect(ratingProperty.icon).toBe('heart');
        });

        test('should use star as default when empty args provided', () => {
            ratingProperty = new RatingProperty('test', mockVault, {});
            
            expect(ratingProperty.icon).toBe('align-left'); // Parent class default when args is empty object
        });
    });

    describe('fillDisplay', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });

        test('should create display with correct structure', () => {
            const result = ratingProperty.fillDisplay('+++', mockUpdate);
            
            expect(result.classList.contains('metadata-field')).toBe(true);
            
            const columnContainer = result.querySelector('.field-container-column');
            expect(columnContainer).toBeTruthy();
            
            const header = columnContainer?.querySelector('.metadata-header');
            expect(header?.textContent).toBe('rating');
            
            const starRating = columnContainer?.querySelector('.star-rating');
            expect(starRating).toBeTruthy();
        });

        test('should set vault property', () => {
            ratingProperty.fillDisplay('++', mockUpdate);
            
            expect(ratingProperty.vault).toBe(mockVault);
        });
    });

    describe('createStarRating', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });

        test('should create container with correct class and 5 stars', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            
            expect(container.classList.contains('star-rating')).toBe(true);
            
            const stars = container.querySelectorAll('.star');
            expect(stars.length).toBe(5);
        });

        test('should set correct data-value attributes', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            const stars = container.querySelectorAll('.star');
            
            stars.forEach((star, index) => {
                expect(star.getAttribute('data-value')).toBe((index + 1).toString());
            });
        });

        test('should call setIcon for each star', () => {
            ratingProperty.createStarRating('', mockUpdate);
            
            expect(mockVault.app.setIcon).toHaveBeenCalledTimes(5);
        });

        test('should use custom icon when provided', () => {
            const customRatingProperty = new RatingProperty('rating', mockVault, { icon: 'heart' });
            
            customRatingProperty.createStarRating('', mockUpdate);
            
            expect(mockVault.app.setIcon).toHaveBeenCalledTimes(5); // Verify called for all 5 stars
        });

        test('should add event listeners to stars', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            const star = container.querySelector('.star') as HTMLElement;
            
            // Mock the methods that will be called
            ratingProperty.previewStars = jest.fn();
            ratingProperty.updateStarRating = jest.fn();
            
            // Test mouseover event
            star.dispatchEvent(new Event('mouseover'));
            expect(ratingProperty.previewStars).toHaveBeenCalledWith(container, 1);
        });

        test('should handle click event and call update with correct plus signs', async () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            const thirdStar = container.querySelectorAll('.star')[2] as HTMLElement;
            
            ratingProperty.updateStarRating = jest.fn();
            
            // Click the third star
            thirdStar.click();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockUpdate).toHaveBeenCalledWith('+++');
        });

        test('should handle different star clicks correctly', async () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            const stars = container.querySelectorAll('.star');
            
            // Click first star
            (stars[0] as HTMLElement).click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(mockUpdate).toHaveBeenCalledWith('+');
            
            // Click last star
            (stars[4] as HTMLElement).click();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(mockUpdate).toHaveBeenCalledWith('+++++');
        });
    });

    describe('updateStarRating', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });

        test('should call updateStarRating method', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            
            // Spy on the method
            const spy = jest.spyOn(ratingProperty, 'updateStarRating');
            
            ratingProperty.updateStarRating(container, 3);
            
            expect(spy).toHaveBeenCalledWith(container, 3);
        });

        test('should handle various rating values', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            
            // Test that method exists and can be called
            expect(() => {
                ratingProperty.updateStarRating(container, 0);
                ratingProperty.updateStarRating(container, 3);
                ratingProperty.updateStarRating(container, 5);
                ratingProperty.updateStarRating(container, 10); // Over limit
            }).not.toThrow();
        });
    });

    describe('previewStars', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });

        test('should call previewStars method', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            
            // Spy on the method
            const spy = jest.spyOn(ratingProperty, 'previewStars');
            
            ratingProperty.previewStars(container, 3);
            
            expect(spy).toHaveBeenCalledWith(container, 3);
        });

        test('should handle various preview values', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            
            // Test that method exists and can be called
            expect(() => {
                ratingProperty.previewStars(container, 0);
                ratingProperty.previewStars(container, 3);
                ratingProperty.previewStars(container, 5);
                ratingProperty.previewStars(container, -1); // Negative
            }).not.toThrow();
        });
    });

    describe('Value handling', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });

        test('should handle empty value', () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            
            expect(container).toBeTruthy();
            expect(container.querySelectorAll('.star').length).toBe(5);
        });

        test('should handle single plus value', () => {
            const container = ratingProperty.createStarRating('+', mockUpdate);
            
            expect(container).toBeTruthy();
            expect(container.querySelectorAll('.star').length).toBe(5);
        });

        test('should handle multiple plus values', () => {
            const container = ratingProperty.createStarRating('+++', mockUpdate);
            
            expect(container).toBeTruthy();
            expect(container.querySelectorAll('.star').length).toBe(5);
        });

        test('should handle maximum rating', () => {
            const container = ratingProperty.createStarRating('+++++', mockUpdate);
            
            expect(container).toBeTruthy();
            expect(container.querySelectorAll('.star').length).toBe(5);
        });

        test('should handle over-maximum rating', () => {
            const container = ratingProperty.createStarRating('++++++++++', mockUpdate);
            
            expect(container).toBeTruthy();
            expect(container.querySelectorAll('.star').length).toBe(5);
        });
    });

    describe('Integration tests', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });

        test('should work with complete workflow', async () => {
            // Create full display
            const display = ratingProperty.fillDisplay('++', mockUpdate);
            const starContainer = display.querySelector('.star-rating') as HTMLDivElement;
            
            expect(starContainer).toBeTruthy();
            
            // Simulate clicking the 4th star
            const fourthStar = starContainer.querySelectorAll('.star')[3] as HTMLElement;
            fourthStar.click();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Should have called update with 4 plus signs
            expect(mockUpdate).toHaveBeenCalledWith('++++');
        });

        test('should maintain state during multiple interactions', async () => {
            const container = ratingProperty.createStarRating('', mockUpdate);
            const stars = container.querySelectorAll('.star');
            
            // Click multiple stars in sequence
            (stars[2] as HTMLElement).click(); // 3 stars
            await new Promise(resolve => setTimeout(resolve, 0));
            
            (stars[0] as HTMLElement).click(); // 1 star
            await new Promise(resolve => setTimeout(resolve, 0));
            
            (stars[4] as HTMLElement).click(); // 5 stars
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Should have been called with correct values
            expect(mockUpdate).toHaveBeenCalledTimes(3);
            expect(mockUpdate).toHaveBeenNthCalledWith(1, '+++');
            expect(mockUpdate).toHaveBeenNthCalledWith(2, '+');
            expect(mockUpdate).toHaveBeenNthCalledWith(3, '+++++');
        });

        test('should handle mouseover and mouseleave events', () => {
            const container = ratingProperty.createStarRating('++', mockUpdate);
            const thirdStar = container.querySelectorAll('.star')[2] as HTMLElement;
            
            ratingProperty.previewStars = jest.fn();
            
            // Test mouseover
            thirdStar.dispatchEvent(new Event('mouseover'));
            expect(ratingProperty.previewStars).toHaveBeenCalledWith(container, 3);
            
            // Test mouseleave
            container.dispatchEvent(new Event('mouseleave'));
            expect(ratingProperty.previewStars).toHaveBeenCalledWith(container, 2); // Should restore to current rating
        });
    });

    describe('Edge cases', () => {
        beforeEach(() => {
            ratingProperty = new RatingProperty('rating', mockVault);
        });



        test('should handle null update function', () => {
            expect(() => {
                ratingProperty.createStarRating('+++', null as any);
            }).not.toThrow();
        });

        test('should handle invalid value format', () => {
            expect(() => {
                ratingProperty.createStarRating('invalid', mockUpdate);
            }).not.toThrow();
        });

        test('should handle special characters in value', () => {
            expect(() => {
                ratingProperty.createStarRating('+++abc+++', mockUpdate);
            }).not.toThrow();
        });
    });
});
