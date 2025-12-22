/**
 * @jest-environment jsdom
 */

import { ObjectProperty } from "../../src/properties/ObjectProperty";
import { DateProperty } from "../../src/properties/DateProperty";
import { FileProperty } from "../../src/properties/FileProperty";
import { NumberProperty } from "../../src/properties/NumberProperty";
import { mockApp } from "../utils/mocks";

describe("ObjectProperty - Double Generation with nested ObjectProperty", () => {
    let vault: any;

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
        document.body.innerHTML = '';
    });

    it("should not share containers between different parent objects when adding to nested ObjectProperty", async () => {
        // Configuration: animations avec animateurs imbriqués
        const animateursProperty = new ObjectProperty(
            "animateurs",
            vault,
            {
                animateur: new FileProperty("animateur", vault, ["Animateur"]),
                tarif: new NumberProperty("tarif", vault, { unit: "€" })
            },
            { tooltip: "Animateurs" }
        );

        const animationsProperty = new ObjectProperty(
            "animations",
            vault,
            {
                date: new DateProperty("date", vault, []),
                animateurs: animateursProperty
            },
            { tooltip: "Animations" }
        );

        // Données initiales : 2 animations
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

        // Créer le display initial
        const display = animationsProperty.fillDisplay(currentData, updateFn);
        document.body.appendChild(display);

        // Récupérer les containers des animateurs pour chaque animation
        const animateursContainers = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        console.log("Nombre de containers animateurs trouvés:", animateursContainers.length);
        expect(animateursContainers.length).toBe(2); // Un par animation

        // Extraire les classes uniques pour vérifier qu'elles sont différentes
        const container1Classes = Array.from(animateursContainers[0].classList);
        const container2Classes = Array.from(animateursContainers[1].classList);
        
        const uuid1 = container1Classes.find(c => c.startsWith("metadata-object-container-animateurs-"));
        const uuid2 = container2Classes.find(c => c.startsWith("metadata-object-container-animateurs-"));

        console.log("Container 1 UUID class:", uuid1);
        console.log("Container 2 UUID class:", uuid2);

        // Les UUIDs doivent être différents
        expect(uuid1).not.toBe(uuid2);

        // Compter les rows dans chaque container AVANT l'ajout
        const rows1Before = animateursContainers[0].querySelectorAll(".metadata-object-row").length;
        const rows2Before = animateursContainers[1].querySelectorAll(".metadata-object-row").length;

        console.log("Rows dans animation 1 AVANT:", rows1Before);
        console.log("Rows dans animation 2 AVANT:", rows2Before);

        expect(rows1Before).toBe(1);
        expect(rows2Before).toBe(1);

        // Trouver le bouton add du premier container animateurs
        const firstAnimateursContainer = animateursContainers[0];
        const addButton = firstAnimateursContainer.querySelector(".metadata-add-button") as HTMLButtonElement;
        
        expect(addButton).not.toBeNull();

        // Spy sur console.log pour voir les appels fillDisplay
        const logSpy = jest.spyOn(console, 'log');

        // Simuler le click sur le bouton add (cela va déclencher le modal mocké)
        await addButton.click();

        // Attendre que les mises à jour asynchrones se terminent
        await new Promise(resolve => setTimeout(resolve, 100));

        logSpy.mockRestore();

        // Récupérer à nouveau les containers après l'ajout
        const animateursContainersAfter = display.querySelectorAll('[class*="metadata-object-container-animateurs-"]');
        
        // Compter les rows dans chaque container APRÈS l'ajout
        const rows1After = animateursContainersAfter[0].querySelectorAll(".metadata-object-row").length;
        const rows2After = animateursContainersAfter[1].querySelectorAll(".metadata-object-row").length;

        console.log("Rows dans animation 1 APRÈS:", rows1After);
        console.log("Rows dans animation 2 APRÈS:", rows2After);

        // BUG DÉTECTÉ: querySelector trouve toujours le premier container
        // Donc quand on ajoute à la première animation, cela recharge le premier container
        // mais aussi tous les autres containers avec le même nom !
        
        // VÉRIFICATION CRITIQUE : 
        // ACTUELLEMENT (avec le bug): les deux containers ont 2 rows
        // CE QU'ON VEUT: seul le premier container doit avoir 2 rows
        expect(rows1After).toBe(2); // Premier container doit avoir 2 animateurs
        
        // CE TEST VA ÉCHOUER À CAUSE DU BUG
        expect(rows2After).toBe(1); // Deuxième container doit toujours avoir 1 animateur

        logSpy.mockRestore();
        document.body.removeChild(display);
    });
});
