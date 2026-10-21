import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MediaProperty } from "./MediaProperty";
import { Vault } from "../vault/Vault";

// Extensions de rendu 3D embarquable
export const GLB_EXTENSIONS = ["glb", "gltf"];
// Fichiers FreeCAD : le rendu vient d'un GLB exporte a cote du fichier
export const FREECAD_EXTENSIONS = ["fcstd", "fcstd1"];

/**
 * Genere la liste des chemins GLB/GLTF candidats pour un fichier donne.
 * Les candidats sont bases sur le stem du fichier, puis sur des noms
 * supplementaires (Code, nom du fichier...).
 */
export function getGlbCandidates(mediaPath: string, extraNames: string[] = []): string[] {
    const separatorIndex = mediaPath.lastIndexOf("/");
    const folder = separatorIndex >= 0 ? mediaPath.substring(0, separatorIndex) : "";
    const base = separatorIndex >= 0 ? mediaPath.substring(separatorIndex + 1) : mediaPath;
    const stem = base.replace(/\.[^.]+$/i, "");

    const candidates: string[] = [];
    const push = (name: string) => {
        const path = folder ? `${folder}/${name}` : name;
        if (!candidates.includes(path)) {
            candidates.push(path);
        }
    };

    push(`${stem}.glb`);
    push(`${stem}.gltf`);
    for (const extra of extraNames) {
        if (extra) {
            push(`${extra}.glb`);
        }
    }
    console.log(`getGlbCandidates(${mediaPath}, [${extraNames.join(", ")}]) => [${candidates.join(", ")}]`);
    return candidates;
}

/**
 * ThreeDModelProperty - propriete media 3D.
 *
 * - Rend un fichier GLB/GLTF dans un canvas three.js interactif (orbit controls)
 * - Pour un fichier FreeCAD (.FCStd), cherche le GLB associe (meme stem, Code,
 *   nom du fichier) et le rend ; sinon affiche un bouton pour ouvrir FreeCAD
 * - Le bouton d'ouverture delegue a IApp.openExternal (l'app par defaut de l'OS)
 */
export class ThreeDModelProperty extends MediaProperty {

    public override type: string = "3dmodel";
    public openLabel: string;

    constructor(name: string, vault: Vault, args: { icon?: string; display?: string; create?: string; tooltip?: string; openLabel?: string } = { icon: "box" }) {
        super(name, vault, { icon: "box", ...args });
        this.openLabel = args.openLabel || "Ouvrir dans FreeCAD";
    }

    override fillDisplay(value: any, update: (value: any) => Promise<void>, file: any = null): HTMLDivElement {
        const mediaPath = this.vault.readLinkFile(value, true);
        const extension = (mediaPath?.split(".").pop() || "").toLowerCase();
        console.log(`[ThreeDModel] fillDisplay("${this.name}") valeur="${value}" -> chemin="${mediaPath}" (extension: ${extension || "aucune"})`);

        if (!mediaPath || ![...GLB_EXTENSIONS, ...FREECAD_EXTENSIONS].includes(extension)) {
            console.log(`[ThreeDModel] fallback vers MediaProperty (non 3D ou chemin vide)`);
            return super.fillDisplay(value, update, file);
        }

        const container = document.createElement("div");
        container.classList.add("embed-container");
        container.style.position = "relative";
        // La resolution des liens/candidats est asynchrone : le conteneur est
        // retourne immediatement et peuple en arriere-plan
        void this.populate(container, mediaPath, extension, file, update, value);
        return container;
    }

    protected async populate(container: HTMLDivElement, mediaPath: string, extension: string, file: any, update: (value: any) => Promise<void>, value: any): Promise<void> {
        let renderPath: string | null = null;
        let openPath: string | null = null;

        if (GLB_EXTENSIONS.includes(extension)) {
            const mediaFile = await this.vault.app.getFile(mediaPath);
            console.log(`[ThreeDModel] fichier GLB ${mediaFile ? "trouve" : "INTROUVABLE"}: "${mediaPath}"`);
            if (mediaFile) {
                renderPath = mediaPath;
                openPath = mediaPath;
            }
        } else {
            // Fichier FreeCAD : le fichier source est toujours proposable a l'ouverture
            openPath = mediaPath;
            const freecadFile = await this.vault.app.getFile(mediaPath);
            console.log(`[ThreeDModel] fichier FreeCAD ${freecadFile ? "trouve" : "INTROUVABLE"}: "${mediaPath}"`);

            // Noms supplementaires pour retrouver le GLB : nom du fichier, Code
            // fillDisplay recoit un wrapper File (pas la Classe) : on remonte
            // a la Classe pour lire les proprietes
            const classe = await this.resolveClasse(file);
            console.log(`[ThreeDModel] classe resolue: ${classe ? classe.constructor?.name ?? "ok" : "ECHEC"}`);

            const extraNames: string[] = [];
            try {
                if (classe?.getName) {
                    // getName() peut renvoyer le nom avec extension (.md) : on la retire
                    const fileName = String(classe.getName()).replace(/\.md$/i, "");
                    if (fileName) {
                        extraNames.push(fileName.split(" - ")[0]);
                    }
                }
                if (classe?.getPropertyValue) {
                    // Fallback : Code ecrit dans le frontmatter (anciens fichiers)
                    const metadataCode = await classe.getPropertyValue("Code");
                    if (metadataCode) {
                        extraNames.push(String(metadataCode));
                    }
                }
                if (classe?.getProperty) {
                    // Le Code est une FormulaProperty (write: false) : sa valeur
                    // ne vit que dans la propriete, pas dans le frontmatter
                    const codeProperty = classe.getProperty("Code");
                    if (codeProperty?.read) {
                        const code = await codeProperty.read(classe);
                        if (code) {
                            extraNames.push(String(code));
                        }
                    }
                }
            } catch (error) {
                console.warn("[ThreeDModel] Impossible de lire les noms de resolution GLB:", error);
            }
            console.log(`[ThreeDModel] noms de resolution extra: [${extraNames.join(", ")}] (nom=${file?.getName?.() ?? "?"})`);

            for (const candidate of getGlbCandidates(mediaPath, extraNames)) {
                const candidateFile = await this.vault.app.getFile(candidate);
                console.log(`[ThreeDModel] candidat GLB ${candidateFile ? "OK" : "absent"}: "${candidate}"`);
                if (candidateFile) {
                    renderPath = candidate;
                    break;
                }
            }
        }

        console.log(`[ThreeDModel] resolution finale: rendu="${renderPath ?? "aucun"}" ouverture="${openPath ?? "aucune"}"`);

        if (renderPath) {
            try {
                this.render3DModel(renderPath, container);
            } catch (error) {
                console.error("Echec du rendu 3D:", error);
                this.createError(container, "Rendu 3D indisponible (WebGL requis)");
            }

            // Overlays du viewer herites de MediaProperty : lien (changement de
            // fichier) en haut a gauche, ouverture externe en haut a droite
            if (openPath) {
                container.appendChild(this.createEmbedEditContainer(update, value));
                container.appendChild(this.createEmbedOpenContainer(update, value));
            }
        } else {
            this.createError(container, "Rendu 3D introuvable. Ouvrir le fichier dans FreeCAD pour le créer.");
        }

        if (openPath) {
            container.appendChild(this.createOpenButton(openPath));
        }
    }

    /**
     * Remonte a la Classe depuis l'objet passe a fillDisplay :
     * soit une Classe, soit un wrapper File (via Vault.getFromFile)
     */
    protected async resolveClasse(file: any): Promise<any> {
        if (!file) {
            return null;
        }
        if (typeof file.getProperty === "function") {
            return file;
        }
        if (file.file && this.vault.getFromFile) {
            try {
                return await this.vault.getFromFile(file.file);
            } catch (error) {
                console.warn("[ThreeDModel] getFromFile a echoue:", error);
                return null;
            }
        }
        return null;
    }

    /**
     * Ouvre le fichier source avec l'application par defaut de l'OS
     * (FreeCAD pour un .FCStd) - surcharge de MediaProperty.openFile
     * qui passe par IApp.openExternal au lieu de IApp.open
     */
    override openFile(value: string) {
        const mediaPath = this.vault.readLinkFile(value, true);
        if (mediaPath) {
            void this.vault.app.openExternal(mediaPath);
        }
    }

    /**
     * Bouton d'ouverture du fichier source avec l'application par defaut
     * (FreeCAD pour un .FCStd)
     */
    protected createOpenButton(path: string): HTMLButtonElement {
        const button = document.createElement("button");
        button.classList.add("mod-cta", "open-external-button");
        button.textContent = this.openLabel;
        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            try {
                await this.vault.app.openExternal(path);
            } catch (error) {
                console.error(`Impossible d'ouvrir ${path}:`, error);
            }
        });
        return button;
    }

    protected createError(container: HTMLDivElement, message: string): void {
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("embed-3d-error");
        errorDiv.textContent = message;
        errorDiv.style.textAlign = "center";
        errorDiv.style.margin = "40px auto";
        errorDiv.style.color = "var(--text-error, #c00)";
        container.appendChild(errorDiv);
    }

    /**
     * Rend le modele GLTF dans un canvas three.js :
     * centrage automatique, echelle pour remplir la vue, 6 lumieres
     * directionnelles, camera face a la plus grande surface, orbit controls.
     */
    protected render3DModel(mediaPath: string, container: HTMLDivElement): void {
        const embed = document.createElement("canvas");
        embed.classList.add("embed-media");
        container.appendChild(embed);

        const renderer = new THREE.WebGLRenderer({ canvas: embed, alpha: true, antialias: true });
        renderer.setSize(300, 300);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
        camera.position.set(0, 10, 0);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);

        // Lumieres directionnelles dans les 6 directions pour un eclairage uniforme
        const directions = [
            [0, 10, 0],
            [0, -10, 0],
            [10, 0, 0],
            [-10, 0, 0],
            [0, 0, 10],
            [0, 0, -10],
        ];
        directions.forEach((dir) => {
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(dir[0], dir[1], dir[2]);
            light.target.position.set(0, 0, 0);
            scene.add(light);
            scene.add(light.target);
        });
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        let animationActive = true;
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        controls.target.set(0, 0, 0);

        const loader = new GLTFLoader();
        const resourceUrl = (this.vault.app as any).getResourceUrl
            ? (this.vault.app as any).getResourceUrl(mediaPath)
            : this.vault.app.getAbsolutePath(mediaPath);

        loader.load(
            resourceUrl,
            (gltf: any) => {
                const model = gltf.scene;
                model.traverse((child: any) => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        for (const mat of materials) {
                            if (mat.transparent || mat.opacity < 0.5) {
                                mat.opacity = 1;
                                mat.transparent = false;
                            }
                        }
                    }
                });

                // Centrage et mise a l'echelle du modele
                const box = new THREE.Box3().setFromObject(model);
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                box.getCenter(center);
                box.getSize(size);
                model.position.sub(center);

                const maxDim = Math.max(size.x, size.y, size.z);
                const viewHeight = 2 * camera.position.y * Math.tan((camera.fov * Math.PI) / 360);
                const scale = (viewHeight * 0.8) / maxDim;
                model.scale.setScalar(scale);
                model.rotation.set(0, 0, 0);

                // Camera face a la plus grande surface projetee
                const sx = size.y * size.z;
                const sy = size.x * size.z;
                const sz = size.x * size.y;
                if (sx >= sy && sx >= sz) {
                    camera.position.set(10, 0, 0);
                    camera.up.set(0, 1, 0);
                } else if (sy >= sx && sy >= sz) {
                    camera.position.set(0, 10, 0);
                    camera.up.set(0, 0, -1);
                } else {
                    camera.position.set(0, 0, 10);
                    camera.up.set(0, 1, 0);
                }
                camera.lookAt(0, 0, 0);
                controls.target.set(0, 0, 0);

                const newBox = new THREE.Box3().setFromObject(model);
                const newCenter = new THREE.Vector3();
                newBox.getCenter(newCenter);
                model.position.sub(newCenter);

                scene.add(model);
                animate();
            },
            undefined,
            (error: any) => {
                console.error("Erreur lors du chargement du modele 3D:", error);
                this.createError(container, "Erreur lors du chargement du modele 3D");
            }
        );

        const animate = () => {
            if (!animationActive) {
                return;
            }
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };

        // Pause du rendu quand la souris quitte le canvas (economie de ressources)
        embed.addEventListener("mouseenter", () => {
            animationActive = true;
            animate();
        });
        embed.addEventListener("mouseleave", () => {
            animationActive = false;
        });
    }
}
