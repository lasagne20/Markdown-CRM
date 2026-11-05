/**
 * @jest-environment jsdom
 *
 * Capture d'emails : parsing de fils multi-mails, rattachement par adresse
 * et ingestion dans la propriété `suivie`.
 *
 * Parcours validé :
 *   1. L'utilisateur colle le contenu brut d'un fil (un ou plusieurs mails,
 *      citations comprises) dans un modal
 *   2. Le parser segmente le fil en mails individuels : entêtes "Afficher
 *      l'original" (From/Date/Subject), citations Gmail FR ("Le ven. 25 oct.
 *      a écrit :"), anglais ("On Oct 25, 2026, at 2:32 PM, ... wrote:"),
 *      transferts ("---------- Message transféré ----------")
 *   3. Les adresses (expéditeur + destinataires) sont rattachées aux fichiers
 *      du vault (email de Personne/Commune/Institution) ; une adresse d'un
 *      Commercial = "nous"
 *   4. Les entrées sont fusionnées dans `suivie` (tri chronologique,
 *      déduplication par empreinte) et écrites en UNE passe atomique
 *
 * Les entrées suivie portent un `id` (empreinte de déduplication) : un
 * recollage du même fil ne crée pas de doublon.
 */

import { EmailThreadParser, ParsedEmail } from '../../src/utils/EmailThreadParser';
import { EmailIngestionService } from '../../src/utils/EmailIngestion';

const threadGmailFR = `Bonjour, nous serions intéressés par un atelier énergies pour nos CM2.

Cordialement,
Marie

Le ven. 25 oct. 2026 à 14:32, Léo <leo@territoiressciences.fr> a écrit :
> Bonjour Marie,
>
> Merci pour votre message, nous pouvons proposer un atelier en novembre.
>
> Bien à vous,
> Léo`;

const threadOriginalHeaders = `From: Marie Martin <marie@mairie-vizille.fr>
Date: 24 oct. 2026
Subject: Demande d'atelier énergies
To: leo@territoiressciences.fr

Bonjour,

Pourriez-vous nous faire une proposition ?

---------- Message transféré ----------
De : Marie Martin <marie@mairie-vizille.fr>
Date : 20 octobre 2026
Objet : Première demande

Bonjour, je me permets de vous contacter.`;

describe('EmailThreadParser - segmentation et extraction', () => {
    test('PLANTE : fil Gmail FR - deux mails, citation nettoyée, auteur et adresse de la citation extraits', () => {
        const emails = EmailThreadParser.parse(threadGmailFR);

        expect(emails).toHaveLength(2);

        // Le mail récent (en haut) : auteur inconnu (pas d'entête), destinataire connu
        const recent = emails[0];
        expect(recent.fromEmail).toBeNull();
        expect(recent.toEmails).toContain('leo@territoiressciences.fr');
        expect(recent.body).toContain('atelier énergies');
        expect(recent.body).not.toContain('> Bonjour Marie');

        // Le mail cité : auteur Léo, adresse et date extraits de la ligne de citation
        const quoted = emails[1];
        expect(quoted.fromName).toBe('Léo');
        expect(quoted.fromEmail).toBe('leo@territoiressciences.fr');
        expect(quoted.date).toBe('2026-10-25');
        expect(quoted.body).toContain('Merci pour votre message');
        expect(quoted.body).not.toContain('Le ven. 25 oct');
    });

    test("PLANTE : entêtes 'Afficher l'original' + message transféré -> From/Date/Subject/To parsés", () => {
        const emails = EmailThreadParser.parse(threadOriginalHeaders);

        expect(emails).toHaveLength(2);

        const first = emails[0];
        expect(first.fromName).toBe('Marie Martin');
        expect(first.fromEmail).toBe('marie@mairie-vizille.fr');
        expect(first.date).toBe('2026-10-24');
        expect(first.subject).toBe("Demande d'atelier énergies");
        expect(first.toEmails).toContain('leo@territoiressciences.fr');
        expect(first.body).toContain('Pourriez-vous nous faire une proposition');

        const forwarded = emails[1];
        expect(forwarded.fromEmail).toBe('marie@mairie-vizille.fr');
        expect(forwarded.date).toBe('2026-10-20');
        expect(forwarded.subject).toBe('Première demande');
        expect(forwarded.body).toContain('je me permets de vous contacter');
    });

    test("PLANTE : citation Gmail anglaise (On Oct 25... wrote:)", () => {
        const raw = `Thanks for the proposal!

On Oct 25, 2026, at 2:32 PM, Léo <leo@territoiressciences.fr> wrote:
> Here is our proposal.`;

        const emails = EmailThreadParser.parse(raw);

        expect(emails).toHaveLength(2);
        expect(emails[1].fromEmail).toBe('leo@territoiressciences.fr');
        expect(emails[1].date).toBe('2026-10-25');
        expect(emails[0].body).toContain('Thanks for the proposal');
    });

    test('PLANTE : texte quasi brut sans entête -> un mail unique, date nulle mais corps conservé', () => {
        const raw = `Bonjour, voici un message collé sans aucune mise en forme.
Sur plusieurs lignes.`;
        const emails = EmailThreadParser.parse(raw);

        expect(emails).toHaveLength(1);
        expect(emails[0].date).toBeNull();
        expect(emails[0].body).toContain('sans aucune mise en forme');
    });

    test("PLANTE : empreinte stable (même entrée -> même id), différente pour des contenus différents", () => {
        const emails1 = EmailThreadParser.parse(threadGmailFR);
        const emails2 = EmailThreadParser.parse(threadGmailFR);

        // Même fil re-parsé -> mêmes empreintes (déduplication au recollage)
        expect(emails1.map((e: ParsedEmail) => e.fingerprint)).toEqual(
            emails2.map((e: ParsedEmail) => e.fingerprint)
        );

        // Deux mails différents du même fil -> empreintes différentes
        expect(emails1[0].fingerprint).not.toBe(emails1[1].fingerprint);
    });
});

describe('EmailIngestionService - rattachement par adresse', () => {
    let instances: any[];
    let service: EmailIngestionService;

    const makeFile = (name: string, className: string, email?: string) => ({
        getName: () => name,
        getClassName: () => className,
        getPropertyValue: async (prop: string) => (prop === 'email' ? email : undefined),
        getPath: () => `Test/${name}.md`,
        updatePropertyValue: jest.fn(async () => undefined)
    });

    beforeEach(() => {
        instances = [
            makeFile('Marie Martin', 'Personne', 'marie@mairie-vizille.fr'),
            makeFile('Mairie de Vizille', 'Commune', 'contact@mairie-vizille.fr'),
            makeFile('Mairie de Vizille', 'Institution', 'contact@mairie-vizille.fr'),
            makeFile('Léo', 'Commercial', 'leo@territoiressciences.fr')
        ];
        const vault: any = {
            getDynamicClassFactory: () => ({
                getAllInstancesForClass: jest.fn(async (className: string) =>
                    instances.filter((i) => i.getClassName() === className)
                )
            })
        };
        service = new EmailIngestionService(vault);
    });

    test('PLANTE : une adresse du vault renvoie les fichiers correspondants (toutes classes)', async () => {
        const matches = await service.findFilesByEmail('marie@mairie-vizille.fr');
        expect(matches).toHaveLength(1);
        expect(matches[0].getName()).toBe('Marie Martin');
    });

    test("PLANTE : la même adresse sur deux classes -> les deux fichiers (choix à l'utilisateur)", async () => {
        const matches = await service.findFilesByEmail('contact@mairie-vizille.fr');
        expect(matches).toHaveLength(2);
    });

    test('PLANTE : adresse inconnue -> aucune correspondance', async () => {
        const matches = await service.findFilesByEmail('inconnu@nulle-part.fr');
        expect(matches).toHaveLength(0);
    });

    test("PLANTE : l'adresse d'un Commercial est reconnue comme \"nous\"", async () => {
        expect(await service.isOwnAddress('leo@territoiressciences.fr')).toBe(true);
        expect(await service.isOwnAddress('marie@mairie-vizille.fr')).toBe(false);
    });
});

describe('EmailIngestionService - ingestion dans suivie', () => {
    let target: any;
    let service: EmailIngestionService;

    beforeEach(() => {
        target = {
            getName: () => 'Marie Martin',
            getPropertyValue: jest.fn(async (prop: string) =>
                prop === 'suivie' ? [{ date: '2026-10-01', type: 'Appel', description: 'Appel initial' }] : undefined
            ),
            updatePropertyValue: jest.fn(async () => undefined)
        };
        const vault: any = {
            getDynamicClassFactory: () => ({ getAllInstancesForClass: jest.fn(async () => []) })
        };
        service = new EmailIngestionService(vault);
    });

    test('PLANTE : les mails sont ajoutés à la suite existante, triés par date, en UNE écriture', async () => {
        const emails = EmailThreadParser.parse(threadGmailFR);
        // Le mail du haut (sans date) prend la date du jour, l'autre 2026-10-25
        const result = await service.ingest(target, emails, { today: '2026-10-28' });

        expect(result.added).toBe(2);
        // Un seul appel d'écriture (atomique)
        expect(target.updatePropertyValue).toHaveBeenCalledTimes(1);

        const written = target.updatePropertyValue.mock.calls[0][1];
        // Suivie complète : l'entrée existante + 2 nouvelles, tri chronologique
        expect(written).toHaveLength(3);
        expect(written[0].date).toBe('2026-10-01');
        expect(written[1].date).toBe('2026-10-25');
        expect(written[1].type).toBe('Email');
        expect(written[2].date).toBe('2026-10-28');
        // Chaque entrée porte son empreinte de déduplication
        expect(written[1].id).toBeTruthy();
        expect(written[2].id).toBeTruthy();
    });

    test('PLANTE : re-coller le même fil ne crée pas de doublon (dédup par id)', async () => {
        const emails = EmailThreadParser.parse(threadGmailFR);
        await service.ingest(target, emails, { today: '2026-10-28' });

        // La suivie contient maintenant les entrées avec leurs id
        const writtenOnce = target.updatePropertyValue.mock.calls[0][1];
        target.getPropertyValue = jest.fn(async () => writtenOnce);

        // Second collage du même fil : tout est déjà enregistré
        const result = await service.ingest(target, emails, { today: '2026-10-28' });

        expect(result.added).toBe(0);
        expect(result.skipped).toBe(2);
        // Pas de nouvelle écriture
        expect(target.updatePropertyValue).toHaveBeenCalledTimes(1);
    });

    test("PLANTE : chaque entrée a le type 'Email' et une description nettoyée", async () => {
        const emails = EmailThreadParser.parse(threadGmailFR);
        await service.ingest(target, emails, { today: '2026-10-28' });

        const written = target.updatePropertyValue.mock.calls[0][1];
        const emailEntry = written.find((e: any) => e.date === '2026-10-25');
        expect(emailEntry.type).toBe('Email');
        expect(emailEntry.description).toContain('Merci pour votre message');
        expect(emailEntry.description).not.toContain('> Bonjour Marie');
    });
});
