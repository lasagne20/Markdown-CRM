import { Vault } from "vault/Vault";
import { MediaProperty } from "./MediaProperty";

// Déclarations temporaires pour les dépendances 3D
declare const THREE: any;
declare const GLTFLoader: any;
declare const OrbitControls: any;
declare const FreecadFile: any;
declare const shell: any;

export class ThreeDModelProperty extends MediaProperty {
    
    public override type: string = "3dmodel";

    constructor(name: string, vault : Vault, args: { icon?: string; display?: string; create?: string} = {icon: "box", create: ""}) {
        super(name, vault, args);
    }

    /**
     * Renders a 3D model using THREE.js
     */
    protected render3DModel(mediaPath: string, container: HTMLDivElement): void {
        // Check if the file exists in the vault before trying to load it
        const fileExists = this.vault.app.getFile(mediaPath);
        if (!fileExists) {
            const errorDiv = document.createElement("div");
            errorDiv.textContent = `Rendu 3D introuvable. Ouvrir le fichier dans FreeCAD pour le créer.`;
            console.error("3D model file not found:", mediaPath);
            errorDiv.style.textAlign = "center";
            errorDiv.style.margin = "40px auto";
            errorDiv.style.color = "#c00";
            container.appendChild(errorDiv);
            return;
        }

        const embed = document.createElement("canvas");
        embed.classList.add("embed-media");
        container.appendChild(embed);
        
        const renderer = new THREE.WebGLRenderer({ canvas: embed, alpha: true, antialias: true });
        renderer.setSize(300, 300);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
        // Position the camera directly above, looking down the -Z axis
        camera.position.set(0, 10, 0);
        camera.up.set(0, 0, -1); // Make Z axis "up" for the camera
        camera.lookAt(0, 0, 0);

        // Add multiple directional lights from different directions for even illumination
        const directions = [
            [0, 10, 0],    // Top
            [0, -10, 0],   // Bottom
            [10, 0, 0],    // Right
            [-10, 0, 0],   // Left
            [0, 0, 10],    // Front
            [0, 0, -10],   // Back
        ];
        directions.forEach(dir => {
            const light = new THREE.DirectionalLight(0xffffff, 1);
            light.position.set(dir[0], dir[1], dir[2]);
            light.target.position.set(0, 0, 0);
            scene.add(light);
            scene.add(light.target);
        });
        
        // Optionally add a soft ambient light for subtle fill
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const loader = new GLTFLoader();
        let model: any;
        let animationActive = true; // Track animation state
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooth rotation
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.enableRotate = true;
        controls.minPolarAngle = 0; // Permet toutes les rotations verticales
        controls.maxPolarAngle = Math.PI; // Permet toutes les rotations verticales
        controls.target.set(0, 0, 0);

        loader.load(
            this.vault.app.getAbsolutePath(mediaPath),
            (gltf: any) => {
                model = gltf.scene;
                model.traverse((child: any) => {
                    if (child.isMesh && child.material) {
                        // Handle both array and single material
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        for (const mat of materials) {
                            if (mat.transparent || mat.opacity < 0.5) {
                                // Set mesh to be fully visible (opaque)
                                mat.opacity = 1;
                                mat.transparent = false;
                            }
                        }
                    }
                });

                // Automatically center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = new THREE.Vector3();
                const size = new THREE.Vector3();
                box.getCenter(center);
                box.getSize(size);

                // Center the model at the origin
                model.position.sub(center);

                // Scale model to fill 80% of the 300x300 area
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetFill = 0.8;
                const viewHeight = 2 * camera.position.y * Math.tan((camera.fov * Math.PI) / 360);
                const desiredSize = viewHeight * targetFill;
                const scale = desiredSize / maxDim;
                model.scale.setScalar(scale);

                scene.add(model);

                // Animation function
                const animate = () => {
                    if (animationActive) {
                        requestAnimationFrame(animate);
                        // Rotate the model
                        if (model) {
                            model.rotation.z += 0.01; // Rotate around Z-axis
                        }
                        controls.update(); // Update camera controls
                        renderer.render(scene, camera);
                    }
                };
                animate();

                // Reset model position and rotation after loading
                model.rotation.set(0, 0, 0);

                // Recalculate bounding box after positioning
                const newBox = new THREE.Box3().setFromObject(model);
                const newCenter = new THREE.Vector3();
                newBox.getCenter(newCenter);
                model.position.sub(newCenter);

                controls.update();
            },
            undefined,
            (error: any) => {
                console.error("Erreur lors du chargement du modèle 3D:", error);
                const errorDiv = document.createElement("div");
                errorDiv.textContent = "Erreur lors du chargement du modèle 3D";
                errorDiv.style.textAlign = "center";
                errorDiv.style.margin = "40px auto";
                errorDiv.style.color = "#c00";
                container.appendChild(errorDiv);
            }
        );

        // Add interaction controls
        embed.addEventListener("mouseenter", () => {
            animationActive = false;
        });

        embed.addEventListener("mouseleave", () => {
            animationActive = true;
        });
    }

    override fillDisplay(value: any, update: (value: any) => Promise<void>, file: any = null): HTMLDivElement {
        
        const mediaFile = this.vault.getMediaFromLink(value);
        if (!mediaFile) {
            return super.fillDisplay(value, update, file);
        }

        const mediaPath = this.vault.readLinkFile(value, true);
        if (!mediaPath) {
            return super.fillDisplay(value, update, file);
        }
        const extension = mediaPath.split('.').pop()?.toLowerCase();

        // Check if it's a 3D model file
        if (['gltf', 'glb'].includes(extension || '')) {
            const container = document.createElement("div");
            container.classList.add("embed-container");
            this.render3DModel(mediaPath, container);
            return container;
        }

        // For non-3D files, use the parent MediaProperty behavior
        return super.fillDisplay(value, update, file);
    }
}