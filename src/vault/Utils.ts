import { IApp } from "../interfaces/IApp";
// Utility functions for file metadata operations

export const waitForFileMetaDataUpdate = async (
    app: IApp,
    filePath: string,
    key: string,
    callback: () => Promise<void>
): Promise<void> => {
    // Attendre que les métadonnées du fichier soient mises à jour
    // Dans un environnement réel, ceci surveillerait les changements de métadonnées
    let attempts = 0;
    const maxAttempts = 50;
    
    try {
        while (attempts < maxAttempts) {
            try {
                const file = await app.getFile(filePath);
                if (file) {
                    const metadata = await app.getMetadata(file);
                    if (metadata && metadata[key] !== undefined) {
                        try {
                            await callback();
                        } catch (error) {
                            // Handle callback errors gracefully
                            console.warn('Callback error in waitForFileMetaDataUpdate:', error);
                        }
                        return;
                    }
                }
            } catch (error) {
                // Handle file access errors gracefully
                console.warn('File access error in waitForFileMetaDataUpdate:', error);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // Si on n'arrive pas à détecter le changement, on exécute quand même le callback
        try {
            await callback();
        } catch (error) {
            // Handle callback errors gracefully
            console.warn('Callback error in waitForFileMetaDataUpdate:', error);
        }
    } catch (error) {
        // Handle any other errors gracefully
        console.warn('Unexpected error in waitForFileMetaDataUpdate:', error);
    }
};

export const waitForMetaDataCacheUpdate = async (
    app: any,
    callback: () => Promise<void>
): Promise<void> => {
    // Attendre que le cache des métadonnées soit mis à jour
    // Simulation d'une attente courte
    await new Promise(resolve => setTimeout(resolve, 100));
    // Let callback errors propagate to caller - don't catch them
    await callback();
};
