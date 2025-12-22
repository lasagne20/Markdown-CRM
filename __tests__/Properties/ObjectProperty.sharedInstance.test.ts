/**
 * @jest-environment jsdom
 */

import { ObjectProperty } from "../../src/properties/ObjectProperty";
import { DateProperty } from "../../src/properties/DateProperty";
import { FileProperty } from "../../src/properties/FileProperty";
import { NumberProperty } from "../../src/properties/NumberProperty";
import { mockApp } from "../utils/mocks";

describe("ObjectProperty - SHARED INSTANCE Bug Test", () => {
    let vault: any;
    let sharedAnimateursProperty: ObjectProperty;
    let animationsProperty: ObjectProperty;

    beforeEach(() => {
        const app = mockApp();
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

        // CRÉER UNE SEULE INSTANCE PARTAGÉE - comme dans le vrai code
        sharedAnimateursProperty = new ObjectProperty(
            "animateurs",
            vault,
            {
                animateur: new FileProperty("animateur", vault, ["Animateur"]),
                tarif: new NumberProperty("tarif", vault, { unit: "€" })
            },
            { tooltip: "Animateurs" }
        );

        // Cette instance sera RÉUTILISÉE pour toutes les animations
        animationsProperty = new ObjectProperty(
            "animations",
            vault,
            {
                date: new DateProperty("date", vault, []),
                animateurs: sharedAnimateursProperty  // LA MÊME INSTANCE PARTOUT
            },
            { tooltip: "Animations" }
        );

        document.body.innerHTML = '';
    });

    it("CRITICAL: should NOT share data between animations when using shared ObjectProperty instance", async () => {
        console.log("\n=== TESTING WITH SHARED INSTANCE ===");
        console.log("This simulates the REAL scenario where animateursProperty is reused");
        
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [
                    { animateur: "anim1.md", tarif: 100 }
                ]
            },
            {
                date: "2025-01-20",
                animateurs: [
                    { animateur: "anim2.md", tarif: 150 }
                ]
            },
            {
                date: "2025-01-25",
                animateurs: [
                    { animateur: "anim3.md", tarif: 200 }
                ]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            console.log("\n=== UPDATE CALLED ===");
            console.log(JSON.stringify(value, null, 2));
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        console.log("\n=== INITIAL STATE ===");
        const initialContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        console.log("Nombre de containers animateurs:", initialContainers.length);
        initialContainers.forEach((c, i) => {
            const rows = c.querySelectorAll(".metadata-object-row").length;
            console.log(`  Animation ${i+1}: ${rows} animateur(s)`);
        });

        // Ajouter à la PREMIÈRE animation
        console.log("\n=== ADDING TO ANIMATION 1 ===");
        const addButton1 = initialContainers[0].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton1.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Vérifier l'état après l'ajout
        console.log("\n=== STATE AFTER ADD TO ANIMATION 1 ===");
        const afterAdd1 = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        afterAdd1.forEach((c, i) => {
            const rows = c.querySelectorAll(".metadata-object-row").length;
            console.log(`  Animation ${i+1}: ${rows} animateur(s)`);
        });

        // VÉRIFICATIONS CRITIQUES
        const savedData1 = updateFn.mock.calls[updateFn.mock.calls.length - 1][0];
        console.log("\n=== SAVED DATA CHECK ===");
        console.log("Animation 1 animateurs:", savedData1[0].animateurs.length);
        console.log("Animation 2 animateurs:", savedData1[1].animateurs.length);
        console.log("Animation 3 animateurs:", savedData1[2].animateurs.length);

        expect(savedData1[0].animateurs.length).toBe(2);
        expect(savedData1[1].animateurs.length).toBe(1);
        expect(savedData1[2].animateurs.length).toBe(1);

        // Ajouter à la DEUXIÈME animation
        console.log("\n=== ADDING TO ANIMATION 2 ===");
        const addButton2 = afterAdd1[1].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addButton2.click();
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log("\n=== STATE AFTER ADD TO ANIMATION 2 ===");
        const afterAdd2 = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        afterAdd2.forEach((c, i) => {
            const rows = c.querySelectorAll(".metadata-object-row").length;
            console.log(`  Animation ${i+1}: ${rows} animateur(s)`);
        });

        const savedData2 = updateFn.mock.calls[updateFn.mock.calls.length - 1][0];
        console.log("\n=== FINAL SAVED DATA CHECK ===");
        console.log("Animation 1 animateurs:", savedData2[0].animateurs.length);
        console.log("Animation 2 animateurs:", savedData2[1].animateurs.length);
        console.log("Animation 3 animateurs:", savedData2[2].animateurs.length);

        expect(savedData2[0].animateurs.length).toBe(2);
        expect(savedData2[1].animateurs.length).toBe(2);
        expect(savedData2[2].animateurs.length).toBe(1);

        // Vérifier le DOM
        const rows1 = afterAdd2[0].querySelectorAll(".metadata-object-row").length;
        const rows2 = afterAdd2[1].querySelectorAll(".metadata-object-row").length;
        const rows3 = afterAdd2[2].querySelectorAll(".metadata-object-row").length;

        console.log("\n=== FINAL DOM CHECK ===");
        console.log("Animation 1 DOM rows:", rows1);
        console.log("Animation 2 DOM rows:", rows2);
        console.log("Animation 3 DOM rows:", rows3);

        expect(rows1).toBe(2);
        expect(rows2).toBe(2);
        expect(rows3).toBe(1);

        document.body.removeChild(display);
    });

    it("CRITICAL: should handle multiple operations with shared instance", async () => {
        let currentData = [
            {
                date: "2025-01-15",
                animateurs: [{ animateur: "a1.md", tarif: 100 }]
            },
            {
                date: "2025-01-20",
                animateurs: [{ animateur: "a2.md", tarif: 150 }]
            }
        ];

        const updateFn = jest.fn(async (value: any) => {
            currentData = value;
        });

        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        // Ajouter 2 fois à la première
        let containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        let addBtn = containers[0].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        addBtn = containers[0].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Ajouter 1 fois à la deuxième
        containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        addBtn = containers[1].querySelector(".metadata-add-button") as HTMLButtonElement;
        await addBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Vérifier les données
        const saved = updateFn.mock.calls[updateFn.mock.calls.length - 1][0];
        
        console.log("\n=== MULTI-OP RESULT ===");
        console.log("Animation 1:", saved[0].animateurs.length, "animateurs");
        console.log("Animation 2:", saved[1].animateurs.length, "animateurs");

        expect(saved[0].animateurs.length).toBe(3);
        expect(saved[1].animateurs.length).toBe(2);

        // Supprimer de la première
        containers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        const delBtn = containers[0].querySelector(".metadata-delete-button") as HTMLButtonElement;
        await delBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));

        const final = updateFn.mock.calls[updateFn.mock.calls.length - 1][0];
        console.log("\n=== AFTER DELETE ===");
        console.log("Animation 1:", final[0].animateurs.length, "animateurs");
        console.log("Animation 2:", final[1].animateurs.length, "animateurs");

        expect(final[0].animateurs.length).toBe(2);
        expect(final[1].animateurs.length).toBe(2);

        document.body.removeChild(display);
    });
});
