/**
 * @jest-environment jsdom
 * 
 * Test reproduisant le bug où ajouter un MultiFileProperty dans un ObjectProperty
 * avec plusieurs objets existants modifie le premier objet au lieu du bon objet ciblé.
 * 
 * Bug: querySelector('.metadata-multiFiles-container-files') dans MultiFileProperty.reloadObjects()
 * retourne toujours le premier container, même quand on veut modifier le deuxième/troisième objet.
 */

describe('ObjectProperty - MultiFileProperty Bug', () => {
    
    /**
     * Test démontrant le bug de querySelector avec plusieurs containers ayant la même classe
     */
    test('querySelector bug - always returns first container with same class', () => {
        // Simulate multiple objects in ObjectProperty, each with a MultiFileProperty
        const container1 = document.createElement('div');
        container1.className = 'metadata-multiFiles-container-files';
        container1.setAttribute('data-object-index', '0');
        container1.setAttribute('data-object-id', 'object-1');
        
        const container2 = document.createElement('div');
        container2.className = 'metadata-multiFiles-container-files';
        container2.setAttribute('data-object-index', '1');
        container2.setAttribute('data-object-id', 'object-2');
        
        const container3 = document.createElement('div');
        container3.className = 'metadata-multiFiles-container-files';
        container3.setAttribute('data-object-index', '2');
        container3.setAttribute('data-object-id', 'object-3');
        
        document.body.appendChild(container1);
        document.body.appendChild(container2);
        document.body.appendChild(container3);

        // This is the actual bug in MultiFileProperty.reloadObjects()
        // It uses this querySelector call which always returns the first match:
        const foundContainer = document.querySelector('.metadata-multiFiles-container-files');
        
        // Bug demonstrated: querySelector always returns first container
        expect(foundContainer).toBe(container1); // Always container1
        expect(foundContainer?.getAttribute('data-object-index')).toBe('0');
        expect(foundContainer?.getAttribute('data-object-id')).toBe('object-1');
        
        // Even if we wanted container2 or container3, querySelector gives us container1
        expect(foundContainer).not.toBe(container2);
        expect(foundContainer).not.toBe(container3);

        // This explains why:
        // - Adding files to Object 2 modifies Object 1's display
        // - Adding files to Object 3 modifies Object 1's display
        // - Any MultiFileProperty interaction affects Object 1
    });

    /**
     * Test montrant comment querySelector devrait fonctionner avec des sélecteurs uniques
     */
    test('querySelector should work with unique selectors per object', () => {
        // Create containers with unique identifiers
        const container1 = document.createElement('div');
        container1.className = 'metadata-multiFiles-container-files';
        container1.id = 'multifile-object-0-files'; // Unique ID per object+property
        
        const container2 = document.createElement('div');
        container2.className = 'metadata-multiFiles-container-files';
        container2.id = 'multifile-object-1-files'; // Unique ID per object+property
        
        const container3 = document.createElement('div');
        container3.className = 'metadata-multiFiles-container-files';
        container3.id = 'multifile-object-2-files'; // Unique ID per object+property
        
        document.body.appendChild(container1);
        document.body.appendChild(container2);
        document.body.appendChild(container3);

        // With unique IDs, we can target specific containers
        const targetContainer1 = document.querySelector('#multifile-object-0-files');
        const targetContainer2 = document.querySelector('#multifile-object-1-files');
        const targetContainer3 = document.querySelector('#multifile-object-2-files');
        
        expect(targetContainer1).toBe(container1);
        expect(targetContainer2).toBe(container2);
        expect(targetContainer3).toBe(container3);
        
        // Each container is correctly identified
        expect(targetContainer1).not.toBe(targetContainer2);
        expect(targetContainer2).not.toBe(targetContainer3);
        expect(targetContainer1).not.toBe(targetContainer3);
    });

    /**
     * Test montrant le pattern de fix recommandé
     */
    test('fix pattern - container should be passed as parameter instead of querySelector', () => {
        // Current buggy pattern in MultiFileProperty.reloadObjects():
        // const container = document.querySelector(".metadata-multiFiles-container-" + this.name.toLowerCase());
        
        // Recommended fix pattern:
        // reloadObjects(values: any, update: Function, container: HTMLElement)
        // The container should be passed as a parameter, not searched via querySelector
        
        const mockValues = ['[[File1]]', '[[File2]]'];
        const mockUpdate = jest.fn();
        
        // Simulate multiple containers (like in ObjectProperty with multiple objects)
        const container1 = document.createElement('div');
        const container2 = document.createElement('div');
        const container3 = document.createElement('div');
        
        // Each container should handle its own reload when passed explicitly
        function fixedReloadObjects(values: any, update: Function, targetContainer: HTMLElement) {
            // Use the passed container instead of querySelector
            targetContainer.innerHTML = '';
            targetContainer.appendChild(document.createTextNode(`Files: ${values.join(', ')}`));
        }
        
        // Test that each container gets updated correctly when passed explicitly
        fixedReloadObjects(mockValues, mockUpdate, container1);
        fixedReloadObjects(['[[File3]]'], mockUpdate, container2);
        fixedReloadObjects(['[[File4]]', '[[File5]]'], mockUpdate, container3);
        
        expect(container1.textContent).toBe('Files: [[File1]], [[File2]]');
        expect(container2.textContent).toBe('Files: [[File3]]');
        expect(container3.textContent).toBe('Files: [[File4]], [[File5]]');
        
        // Each container has different content - no cross-contamination
        expect(container1.textContent).not.toBe(container2.textContent);
        expect(container2.textContent).not.toBe(container3.textContent);
    });
});