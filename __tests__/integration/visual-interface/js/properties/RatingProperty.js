import { Property } from './Property.js';
export class RatingProperty extends Property {
    constructor(name, vault, args = { icon: "star" }) {
        super(name, vault, args);
        this.type = "rating";
    }
    fillDisplay(value, update, args) {
        const field = this.createFieldContainer();
        const fieldContainer = document.createElement("div");
        fieldContainer.classList.add("field-container-column");
        const header = document.createElement("div");
        header.classList.add("metadata-header");
        header.textContent = this.title || this.name;
        fieldContainer.appendChild(header);
        const stars = this.createStarRating(value, update);
        fieldContainer.appendChild(stars);
        field.appendChild(fieldContainer);
        return field;
    }
    // Fonction pour créer la notation par étoiles (5 étoiles cliquables)
    createStarRating(value, update) {
        const starContainer = document.createElement("div");
        starContainer.classList.add("star-rating");
        let selectedRating = 0;
        if (value) {
            selectedRating = value.length;
        }
        // Crée les 5 étoiles
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement("div");
            star.classList.add("star");
            star.setAttribute("data-value", i.toString());
            // Utiliser un emoji ou une icône selon le type
            const isEmoji = this.icon.length <= 2; // Si c'est un emoji (1-2 caractères)
            if (isEmoji) {
                // Si c'est un emoji, l'afficher directement
                star.textContent = this.icon;
                star.style.fontSize = "24px";
            }
            else {
                // Si c'est une icône Lucide, utiliser setIcon
                this.vault.app.setIcon(star, this.icon);
            }
            // Ajout des événements pour l'interaction utilisateur
            star.onmouseover = () => {
                // Prévisualiser toutes les étoiles jusqu'à celle-ci
                this.highlightStars(starContainer, i, true);
            };
            star.onclick = async () => {
                selectedRating = i;
                await update('+'.repeat(i)); // Sauvegarde en métadonnées sous forme de "+"
                this.updateStarRating(starContainer, selectedRating);
            };
            starContainer.appendChild(star);
        }
        // Ajouter gestionnaire pour restaurer l'état au survol du conteneur
        starContainer.onmouseleave = () => {
            this.updateStarRating(starContainer, selectedRating);
        };
        this.updateStarRating(starContainer, selectedRating); // Initial update to ensure correct state
        return starContainer;
    }
    // Met à jour l'affichage des étoiles en fonction du niveau actuel
    updateStarRating(starContainer, rating) {
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const svg = star.querySelector("svg");
            if (svg) {
                // Pour les icônes SVG
                svg.classList.remove("hovered-star");
                if (index < rating) {
                    svg.classList.add("filled-star");
                }
                else {
                    svg.classList.remove("filled-star");
                }
            }
            else {
                // Pour les emojis, nettoyer tous les états d'abord
                star.classList.remove("star-filled");
                star.style.filter = "none";
                // Puis appliquer le bon état
                if (index < rating) {
                    star.classList.add("star-filled");
                    star.style.opacity = "1";
                }
                else {
                    star.style.opacity = "0.3";
                }
            }
        });
    }
    // Met en surbrillance les étoiles pour le survol
    highlightStars(starContainer, rating, isHover) {
        const stars = starContainer.querySelectorAll('.star');
        stars.forEach((star, index) => {
            const svg = star.querySelector("svg");
            if (svg) {
                // Pour les icônes SVG - nettoyer d'abord
                svg.classList.remove("hovered-star");
                svg.classList.remove("filled-star");
                // Puis appliquer le bon état
                if (index < rating) {
                    svg.classList.add("filled-star");
                    if (isHover) {
                        svg.classList.add("hovered-star");
                    }
                }
            }
            else {
                // Pour les emojis - nettoyer d'abord tous les états
                star.classList.remove("star-filled");
                star.style.filter = "none";
                star.style.opacity = "0.3";
                // Puis appliquer le bon état
                if (index < rating) {
                    star.style.opacity = "1";
                    star.classList.add("star-filled");
                    if (isHover) {
                        star.style.filter = "brightness(1.2)";
                    }
                }
            }
        });
    }
}
