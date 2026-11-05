/**
 * EmailIngestionService : rattache les mails parsés aux fichiers du vault
 * (par adresse email) et les ingère dans la propriété `suivie`.
 *
 * - findFilesByEmail : cherche l'adresse (insensible à la casse) parmi les
 *   classes Personne / Commune / Institution ; les doublons possibles
 *   (même adresse sur deux classes) sont renvoyés tous : c'est l'UI qui
 *   départage avec l'utilisateur
 * - isOwnAddress : une adresse appartenant à un fichier Commercial, c'est
 *   "nous" - le log doit être rattaché à l'autre partie
 * - ingest : fusionne les entrées dans `suivie` existante, tri
 *   chronologique, déduplication par empreinte (id), UNE écriture atomique
 */

import { ParsedEmail } from './EmailThreadParser';

export interface IngestOptions {
    /** Date du jour (YYYY-MM-DD) pour les mails sans date - injectée en tests */
    today?: string;
    /** Interlocuteur (wikilink "[[Nom]]") enregistré sur chaque entrée */
    interlocuteur?: string;
}

export interface IngestResult {
    added: number;
    skipped: number;
}

const TARGET_CLASSES = ['Personne', 'Commune', 'Institution'];
const OWN_CLASSES = ['Commercial'];
const MAX_DESCRIPTION_LENGTH = 2000;

/** Nom normalisé : minuscules sans accents, espaces collés - pour comparaison */
function normalizeName(name: string): string {
    return stripCombining(name)
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** Retire les diacritiques (é -> e) via decomposition NFD */
function stripCombining(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export class EmailIngestionService {
    constructor(private vault: any) {}

    /**
     * Renvoie les fichiers du vault dont la propriété `email` correspond à
     * l'adresse (toutes classes confondues - l'UI départage).
     */
    async findFilesByEmail(address: string, classes: string[] = TARGET_CLASSES): Promise<any[]> {
        const factory = this.vault?.getDynamicClassFactory?.();
        if (!factory || !address) { return []; }

        const matches: any[] = [];
        // Read scope si disponible : un seul scan de liste par classe
        const withScope = typeof this.vault.withReadScope === 'function'
            ? (work: () => Promise<void>) => this.vault.withReadScope(work)
            : (work: () => Promise<void>) => work();

        const needle = address.toLowerCase().trim();
        await withScope(async () => {
            for (const className of classes) {
                let instances: any[] = [];
                try {
                    instances = await factory.getAllInstancesForClass(className, this.vault);
                } catch {
                    continue;
                }
                for (const instance of instances) {
                    try {
                        const email = await instance.getPropertyValue?.('email');
                        if (email && String(email).toLowerCase().trim() === needle) {
                            matches.push(instance);
                        }
                    } catch {
                        continue;
                    }
                }
            }
        });
        return matches;
    }

    /**
     * Une adresse appartenant à un fichier Commercial, c'est nous.
     */
    async isOwnAddress(address: string): Promise<boolean> {
        const matches = await this.findFilesByEmail(address, OWN_CLASSES);
        return matches.length > 0;
    }

    /**
     * Renvoie les fichiers du vault dont le nom correspond exactement au nom
     * cité (insensible à la casse, aux accents et aux espaces multiples).
     * Sert de repli quand le fil ne contient aucune adresse email
     * ("Le 28/01/2026 à 07:49, école du Village a écrit :").
     */
    async findFilesByName(name: string, classes: string[] = TARGET_CLASSES): Promise<any[]> {
        const factory = this.vault?.getDynamicClassFactory?.();
        if (!factory || !name) { return []; }

        const needle = normalizeName(name);
        if (!needle) { return []; }

        const matches: any[] = [];
        // Read scope si disponible : un seul scan de liste par classe
        const withScope = typeof this.vault.withReadScope === 'function'
            ? (work: () => Promise<void>) => this.vault.withReadScope(work)
            : (work: () => Promise<void>) => work();

        await withScope(async () => {
            for (const className of classes) {
                let instances: any[] = [];
                try {
                    instances = await factory.getAllInstancesForClass(className, this.vault);
                } catch {
                    continue;
                }
                for (const instance of instances) {
                    const instanceName = instance.getName?.();
                    if (instanceName && normalizeName(String(instanceName)) === needle) {
                        matches.push(instance);
                    }
                }
            }
        });
        return matches;
    }

    /**
     * Un nom cité correspondant à un fichier Commercial, c'est nous
     * (le log est rattaché à l'autre partie).
     */
    async isOwnName(name: string): Promise<boolean> {
        const matches = await this.findFilesByName(name, OWN_CLASSES);
        return matches.length > 0;
    }

    /**
     * Fusionne les mails dans la propriété `suivie` de la cible :
     * entrées existantes conservées, tri chronologique, déduplication par
     * empreinte, UNE écriture via updatePropertyValue.
     */
    async ingest(target: any, emails: ParsedEmail[], options: IngestOptions = {}): Promise<IngestResult> {
        const today = options.today ?? new Date().toISOString().slice(0, 10);
        const existing: any[] = (await target.getPropertyValue('suivie')) ?? [];

        const seenIds = new Set<string>(
            existing.map((entry: any) => entry?.id).filter((id: any): id is string => Boolean(id))
        );

        const newEntries: any[] = [];
        let skipped = 0;
        for (const email of emails) {
            if (seenIds.has(email.fingerprint)) {
                skipped += 1;
                continue;
            }
            seenIds.add(email.fingerprint);

            const description = (email.subject ? `${email.subject}\n\n` : '') + email.body;
            newEntries.push({
                id: email.fingerprint,
                date: email.date ?? today,
                type: 'Email',
                interlocuteur: options.interlocuteur ?? undefined,
                description: description.slice(0, MAX_DESCRIPTION_LENGTH)
            });
        }

        if (newEntries.length === 0) {
            return { added: 0, skipped };
        }

        const merged = [...existing, ...newEntries];
        // Tri chronologique (entrées sans date en fin), stable
        merged.sort((a: any, b: any) => {
            const da = a?.date ?? null;
            const db = b?.date ?? null;
            if (da === null && db === null) { return 0; }
            if (da === null) { return 1; }
            if (db === null) { return -1; }
            return String(da).localeCompare(String(db));
        });

        await target.updatePropertyValue('suivie', merged);
        return { added: newEntries.length, skipped };
    }
}
