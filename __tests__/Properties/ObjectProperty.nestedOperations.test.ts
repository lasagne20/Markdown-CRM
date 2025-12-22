/**
 * @jest-environment jsdom
 */

import { ObjectProperty } from "../../src/properties/ObjectProperty";
import { DateProperty } from "../../src/properties/DateProperty";
import { FileProperty } from "../../src/properties/FileProperty";
import { NumberProperty } from "../../src/properties/NumberProperty";
import { mockApp } from "../utils/mocks";

describe("ObjectProperty - Nested Operations (Add/Remove)", () => {
    let vault: any;
    let animateursProperty: ObjectProperty;
    let animationsProperty: ObjectProperty;

    beforeEach(() => {
        const app = mockApp();
        // Mock selectFile to simulate modal selection
        app.selectFile = jest.fn(async () => ({
            getLink: () => "animateur-new.md"
        }));
        
        vault = {
            app: app,
            getFromLink: jest.fn(),
            getFiles: jest.fn(),
            readLinkFile: jest.fn((link: string) => link.replace('.md', '')),
            getExtendedClasses: jest.fn(async (classes: string[]) => classes)
        };

        // Configuration: animations avec animateurs imbriqués
        animateursProperty = new ObjectProperty(
            "animateurs",
            vault,
            {
                animateur: new FileProperty("animateur", vault, ["Animateur"]),
                tarif: new NumberProperty("tarif", vault, { unit: "€" })
            },
            { tooltip: "Animateurs" }
        );

        animationsProperty = new ObjectProperty(
            "animations",
            vault,
            {
                date: new DateProperty("date", vault, []),
                animateurs: animateursProperty
            },
            { tooltip: "Animations" }
        );

        document.body.innerHTML = '';
    });

    it("should add to first animation without affecting second animation", async () => {
        // Données initiales : 2 animations avec 1 animateur chacune
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        // Récupérer les containers
        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        expect(animateursContainers.length).toBe(2);

        // Vérifier l'état initial
        expect(animateursContainers[0].querySelectorAll(".metadata-object-row").length).toBe(1);
        expect(animateursContainers[1].querySelectorAll(".metadata-object-row").length).toBe(1);

        // LOG: vérifier les données avant l'ajout
        console.log("AVANT AJOUT - Data:", JSON.stringify(currentData));

        // Ajouter à la première animation
        const addButton1 = animateursContainers[0].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton1.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // LOG: vérifier les données après l'ajout
        console.log("APRÈS AJOUT - Data:", JSON.stringify(currentData));
        console.log("APRÈS AJOUT - Animation 1 animateurs:", currentData[0].animateurs.length);
        console.log("APRÈS AJOUT - Animation 2 animateurs:", currentData[1].animateurs.length);

        // VÉRIFICATION DES DONNÉES: S'assurer que les données sont correctes
        expect(currentData[0].animateurs.length).toBe(2); // Premier doit avoir 2 animateurs
        expect(currentData[1].animateurs.length).toBe(1); // Deuxième doit avoir 1 animateur

        // Récupérer à nouveau les containers après l'ajout
        const containersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        const rows1After = containersAfter[0].querySelectorAll(".metadata-object-row").length;
        const rows2After = containersAfter[1].querySelectorAll(".metadata-object-row").length;

        console.log("APRÈS AJOUT - DOM Animation 1 rows:", rows1After);
        console.log("APRÈS AJOUT - DOM Animation 2 rows:", rows2After);

        // VÉRIFICATION CRITIQUE DU DOM
        expect(rows1After).toBe(2); // Premier doit avoir 2 animateurs
        expect(rows2After).toBe(1); // Deuxième doit toujours avoir 1 animateur

        document.body.removeChild(display);
    });

    it("should add to second animation without affecting first animation", async () => {
        // Données initiales : 2 animations avec 1 animateur chacune
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        // Récupérer les containers
        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        expect(animateursContainers.length).toBe(2);

        // Ajouter à la DEUXIÈME animation
        const addButton2 = animateursContainers[1].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton2.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Récupérer à nouveau les containers après l'ajout
        const containersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        const rows1After = containersAfter[0].querySelectorAll(".metadata-object-row").length;
        const rows2After = containersAfter[1].querySelectorAll(".metadata-object-row").length;

        // VÉRIFICATION CRITIQUE
        expect(rows1After).toBe(1); // Premier doit toujours avoir 1 animateur
        expect(rows2After).toBe(2); // Deuxième doit avoir 2 animateurs

        document.body.removeChild(display);
    });

    it("should add multiple to first animation without affecting second", async () => {
        // Données initiales : 2 animations avec 1 animateur chacune
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        const addButton1 = animateursContainers[0].querySelector(".metadata-add-button") as HTMLButtonElement;

        // Ajouter 2 fois à la première animation
        await addButton1.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        await addButton1.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Récupérer à nouveau les containers
        const containersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        const rows1After = containersAfter[0].querySelectorAll(".metadata-object-row").length;
        const rows2After = containersAfter[1].querySelectorAll(".metadata-object-row").length;

        expect(rows1After).toBe(3); // Premier doit avoir 3 animateurs
        expect(rows2After).toBe(1); // Deuxième doit toujours avoir 1 animateur

        document.body.removeChild(display);
    });

    it("should remove from first animation without affecting second", async () => {
        // Données initiales : première animation avec 2 animateurs, deuxième avec 1
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 },
                    { animateur: "animateur3.md", tarif: 120 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        // Vérifier l'état initial
        expect(animateursContainers[0].querySelectorAll(".metadata-object-row").length).toBe(2);
        expect(animateursContainers[1].querySelectorAll(".metadata-object-row").length).toBe(1);

        // Supprimer le premier animateur de la première animation
        const deleteButton = animateursContainers[0].querySelector(".metadata-delete-button") as HTMLButtonElement;
        expect(deleteButton).not.toBeNull();
        
        await deleteButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Récupérer à nouveau les containers
        const containersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        const rows1After = containersAfter[0].querySelectorAll(".metadata-object-row").length;
        const rows2After = containersAfter[1].querySelectorAll(".metadata-object-row").length;

        expect(rows1After).toBe(1); // Premier doit avoir 1 animateur (après suppression)
        expect(rows2After).toBe(1); // Deuxième doit toujours avoir 1 animateur

        document.body.removeChild(display);
    });

    it("should remove from second animation without affecting first", async () => {
        // Données initiales : première animation avec 1 animateur, deuxième avec 2
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 },
                    { animateur: "animateur3.md", tarif: 120 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        // Vérifier l'état initial
        expect(animateursContainers[0].querySelectorAll(".metadata-object-row").length).toBe(1);
        expect(animateursContainers[1].querySelectorAll(".metadata-object-row").length).toBe(2);

        // Supprimer le premier animateur de la DEUXIÈME animation
        const deleteButton = animateursContainers[1].querySelector(".metadata-delete-button") as HTMLButtonElement;
        expect(deleteButton).not.toBeNull();
        
        await deleteButton.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Récupérer à nouveau les containers
        const containersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        const rows1After = containersAfter[0].querySelectorAll(".metadata-object-row").length;
        const rows2After = containersAfter[1].querySelectorAll(".metadata-object-row").length;

        expect(rows1After).toBe(1); // Premier doit toujours avoir 1 animateur
        expect(rows2After).toBe(1); // Deuxième doit avoir 1 animateur (après suppression)

        document.body.removeChild(display);
    });

    it("should handle mixed add and remove operations correctly", async () => {
        // Données initiales
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        let containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');

        // Ajouter à la première animation
        let addButton1 = containers[0].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton1.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Ajouter à la deuxième animation
        containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        let addButton2 = containers[1].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton2.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Vérifier l'état
        containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        expect(containers[0].querySelectorAll(".metadata-object-row").length).toBe(2);
        expect(containers[1].querySelectorAll(".metadata-object-row").length).toBe(2);

        // Supprimer de la première animation
        const deleteButton1 = containers[0].querySelector(".metadata-delete-button") as HTMLButtonElement;
        await deleteButton1.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Vérifier l'état final
        containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        expect(containers[0].querySelectorAll(".metadata-object-row").length).toBe(1);
        expect(containers[1].querySelectorAll(".metadata-object-row").length).toBe(2);

        document.body.removeChild(display);
    });

    it("should use separate containers with unique UUIDs for each nested ObjectProperty", async () => {
        // Ce test vérifie que chaque instance de ObjectProperty imbriqué a son propre container avec UUID unique
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "animateur1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "animateur2.md", tarif: 150 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        // Récupérer tous les containers d'animateurs
        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        expect(animateursContainers.length).toBe(2);

        // Vérifier que chaque container a un UUID unique
        const container1Classes = animateursContainers[0].className;
        const container2Classes = animateursContainers[1].className;

        // Extraire les UUIDs des classes
        const uuid1Match = container1Classes.match(/metadata-object-container-animateurs-([a-f0-9-]+)/);
        const uuid2Match = container2Classes.match(/metadata-object-container-animateurs-([a-f0-9-]+)/);

        expect(uuid1Match).toBeTruthy();
        expect(uuid2Match).toBeTruthy();
        expect(uuid1Match![1]).not.toBe(uuid2Match![1]); // Les UUIDs doivent être différents

        console.log("Container 1 UUID:", uuid1Match![1]);
        console.log("Container 2 UUID:", uuid2Match![1]);

        // Vérifier que les data-object-property-id sont également différents
        const dataId1 = animateursContainers[0].getAttribute('data-object-property-id');
        const dataId2 = animateursContainers[1].getAttribute('data-object-property-id');

        expect(dataId1).toBeTruthy();
        expect(dataId2).toBeTruthy();
        expect(dataId1).not.toBe(dataId2);

        console.log("Container 1 data-id:", dataId1);
        console.log("Container 2 data-id:", dataId2);

        // Maintenant, testons que l'ajout utilise le bon container
        const addButton1 = animateursContainers[0].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton1.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Après l'ajout, récupérer à nouveau les containers
        const containersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');

        // Le premier container doit avoir 2 rows
        const rows1 = containersAfter[0].querySelectorAll(".metadata-object-row").length;
        expect(rows1).toBe(2);

        // Le deuxième container doit avoir 1 row
        const rows2 = containersAfter[1].querySelectorAll(".metadata-object-row").length;
        expect(rows2).toBe(1);

        // Vérifier que les UUIDs n'ont pas changé après le reload
        const container1ClassesAfter = containersAfter[0].className;
        const container2ClassesAfter = containersAfter[1].className;

        const uuid1AfterMatch = container1ClassesAfter.match(/metadata-object-container-animateurs-([a-f0-9-]+)/);
        const uuid2AfterMatch = container2ClassesAfter.match(/metadata-object-container-animateurs-([a-f0-9-]+)/);

        expect(uuid1AfterMatch![1]).toBe(uuid1Match![1]); // UUID du container 1 doit rester le même
        expect(uuid2AfterMatch![1]).toBe(uuid2Match![1]); // UUID du container 2 doit rester le même

        console.log("Container 1 UUID after reload:", uuid1AfterMatch![1]);
        console.log("Container 2 UUID after reload:", uuid2AfterMatch![1]);

        document.body.removeChild(display);
    });
});

