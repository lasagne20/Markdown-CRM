/**
 * EmailThreadParser : segmente le contenu brut d'un fil d'emails collé par
 * l'utilisateur en mails individuels.
 *
 * Formats gérés (dans l'ordre de fiabilité) :
 *   1. Entêtes "Afficher l'original" : From:/De :, Date:/Date :, Subject:/Objet :, To:/À :
 *   2. Citations Gmail FR : "Le ven. 25 oct. 2026 à 14:32, Léo <x@y.fr> a écrit :"
 *   3. Citations Gmail EN : "On Oct 25, 2026, at 2:32 PM, Léo <x@y.fr> wrote:"
 *   4. Séparateurs de transfert : "---------- Message transféré ----------"
 *   5. Texte quasi brut : un mail unique, date inconnue
 *
 * Le corps des messages cités (préfixés par ">") est nettoyé. Chaque mail
 * reçoit une empreinte (fingerprint) stable servant de clé de déduplication.
 */

export interface ParsedEmail {
    fromName: string | null;
    fromEmail: string | null;
    toEmails: string[];
    date: string | null;        // YYYY-MM-DD si parsable
    dateRaw: string | null;
    subject: string | null;
    body: string;
    fingerprint: string;
}

const MONTHS_FR: Record<string, number> = {
    janv: 1, janvier: 1, 'f\u00e9vr': 2, 'f\u00e9vrier': 2, fevr: 2, fevrier: 2,
    mars: 3, avr: 4, avril: 4, mai: 5, juin: 6,
    juil: 7, juillet: 7, 'ao\u00fbt': 8, sept: 9, septembre: 9,
    oct: 10, octobre: 10, nov: 11, novembre: 11, 'd\u00e9c': 12, 'd\u00e9cembre': 12, dec: 12, decembre: 12
};
const MONTHS_EN: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/**
 * Parse une date textuelle FR/EN vers YYYY-MM-DD, sinon null.
 */
export function parseEmailDate(raw: string | null | undefined): string | null {
    if (!raw) { return null; }
    const str = raw.trim();

    // FR : "ven. 25 oct. 2026" / "24 oct. 2026" / "20 octobre 2026"
    const fr = str.match(/(\d{1,2})\s+([a-z\u00e0-\u00ff]+)\.?\s+(\d{4})/i);
    if (fr) {
        const month = MONTHS_FR[fr[2].toLowerCase().replace(/\./g, '')];
        if (month) {
            return `${fr[3]}-${pad(month)}-${pad(parseInt(fr[1], 10))}`;
        }
    }

    // EN : "Oct 25, 2026" / "October 25 2026"
    const en = str.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
    if (en) {
        const month = MONTHS_EN[en[1].toLowerCase().slice(0, 3)];
        if (month) {
            return `${en[3]}-${pad(month)}-${pad(parseInt(en[2], 10))}`;
        }
    }
    return null;
}

function extractAddresses(text: string): string[] {
    const out: string[] = [];
    const re = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const address = match[0].toLowerCase();
        if (!out.includes(address)) { out.push(address); }
    }
    return out;
}

interface Segment {
    fromName: string | null;
    fromEmail: string | null;
    toEmails: string[];
    dateRaw: string | null;
    subject: string | null;
    bodyLines: string[];
}

function newSegment(init: Partial<Segment> = {}): Segment {
    return {
        fromName: init.fromName ?? null,
        fromEmail: init.fromEmail ?? null,
        toEmails: init.toEmails ?? [],
        dateRaw: init.dateRaw ?? null,
        subject: init.subject ?? null,
        bodyLines: []
    };
}

/** Ligne de citation Gmail : "Le ven. 25 oct. 2026 à 14:32, Léo <x@y.fr> a écrit :" */
function matchQuoteMarkerFr(line: string): { name: string | null; email: string | null; dateRaw: string | null } | null {
    const fr = line.match(/^Le\s+(.+?)\s+\u00e0\s+[\d:h]+,\s*(?:"([^"]+)"|([^<]+?))\s*<([^>]+)>\s+a\s+\u00e9crit\s*:?\s*$/i);
    if (fr) {
        return {
            name: (fr[2] ?? fr[3] ?? '').trim() || null,
            email: fr[4].toLowerCase(),
            dateRaw: fr[1]
        };
    }
    return null;
}

/** Ligne de citation Gmail EN : "On Oct 25, 2026, at 2:32 PM, Léo <x@y.fr> wrote:" */
function matchQuoteMarkerEn(line: string): { name: string | null; email: string | null; dateRaw: string | null } | null {
    const en = line.match(/^On\s+(.+?),\s+at\s+[\d:\sAPM]+,?\s*(?:"([^"]+)"|([^<]+?))\s*<([^>]+)>\s+wrote\s*:?\s*$/i);
    if (en) {
        return {
            name: (en[2] ?? en[3] ?? '').trim() || null,
            email: en[4].toLowerCase(),
            dateRaw: en[1]
        };
    }
    return null;
}

/** Entête From:/De : "From: Marie Martin <marie@x.fr>" */
function matchFromHeader(line: string): { name: string | null; email: string | null } | null {
    const m = line.match(/^(?:From|De|From:)\s*[:\uff1a]\s*(?:"([^"]+)"|([^<]+?))\s*(?:<([^>]+)>)?\s*$/i);
    if (m) {
        const name = (m[1] ?? m[2] ?? '').trim() || null;
        const email = m[3] ? m[3].toLowerCase() : null;
        if (!name && !email) { return null; }
        return { name, email };
    }
    return null;
}

function djb2Hash(text: string): string {
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
}

/** Nettoie quelques jalons de citation avant de construire l'empreinte. */
function buildFingerprint(segment: Segment): string {
    const body = segment.bodyLines.join('\n').trim().slice(0, 200);
    return djb2Hash(`${segment.fromEmail ?? ''}|${segment.dateRaw ?? ''}|${segment.subject ?? ''}|${body}`);
}

function finalize(segment: Segment): ParsedEmail {
    // Nettoyage du corps : supprimer les lignes de citation "  >" héritées
    const body = segment.bodyLines
        .map((line) => line.replace(/^\s*(>\s?)+/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return {
        fromName: segment.fromName,
        fromEmail: segment.fromEmail,
        toEmails: [...segment.toEmails],
        date: parseEmailDate(segment.dateRaw),
        dateRaw: segment.dateRaw,
        subject: segment.subject,
        body,
        fingerprint: buildFingerprint(segment)
    };
}

export class EmailThreadParser {

    /**
     * Segmente le contenu brut d'un fil en mails individuels, dans l'ordre
     * du texte (le plus récent en premier dans les fils Gmail copiés).
     */
    static parse(raw: string): ParsedEmail[] {
        if (!raw || !raw.trim()) { return []; }

        const emails: ParsedEmail[] = [];
        let current: Segment | null = null;

        const flush = () => {
            if (current && (current.bodyLines.join('').trim() || current.fromEmail)) {
                emails.push(finalize(current));
            }
            current = null;
        };

        const lines = raw.split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trimEnd();
            const stripped = line.trim();

            // Séparateur de transfert : "---------- Message transféré ----------"
            if (/^-{5,}\s*(Message transf\u00e9r|Forwarded message|Message forwarded)/i.test(stripped)) {
                flush();
                current = newSegment();
                continue;
            }

            // Citation FR/EN : ferme le bloc précédent (dont l'auteur est
            // l'adresse citée = le destinataire du bloc qui le précède)
            const quoteFr = matchQuoteMarkerFr(stripped);
            const quoteEn = quoteFr ? null : matchQuoteMarkerEn(stripped);
            const quote = quoteFr ?? quoteEn;
            if (quote) {
                if (current) {
                    if (quote.email && !current.toEmails.includes(quote.email)) {
                        current.toEmails.push(quote.email);
                    }
                }
                flush();
                current = newSegment({
                    fromName: quote.name,
                    fromEmail: quote.email,
                    dateRaw: quote.dateRaw
                });
                continue;
            }

            // Entête From :
            const fromHeader = matchFromHeader(stripped);
            if (fromHeader) {
                flush();
                current = newSegment({
                    fromName: fromHeader.name,
                    fromEmail: fromHeader.email
                });
                continue;
            }

            if (!current) {
                // Texte précédant tout marqueur : le mail le plus récent
                current = newSegment();
            }

            // Entêtes du bloc courant
            const dateMatch = stripped.match(/^(?:Date|Envoy\u00e9(?: le)?)\s*[:\uff1a]\s*(.+)$/i);
            if (dateMatch && current.dateRaw === null) {
                current.dateRaw = dateMatch[1].trim();
                continue;
            }
            const subjectMatch = stripped.match(/^(?:Subject|Objet)\s*[:\uff1a]\s*(.+)$/i);
            if (subjectMatch && current.subject === null) {
                current.subject = subjectMatch[1].trim();
                continue;
            }
            const toMatch = stripped.match(/^(?:To|\u00c0|Cc)\s*[:\uff1a]\s*(.+)$/i);
            if (toMatch) {
                for (const address of extractAddresses(toMatch[1])) {
                    if (!current.toEmails.includes(address)) {
                        current.toEmails.push(address);
                    }
                }
                continue;
            }

            // Corps du mail courant
            current.bodyLines.push(line);
        }
        flush();

        return emails;
    }

    /** Extrait les adresses email d'un texte libre. */
    static extractAddresses(text: string): string[] {
        return extractAddresses(text);
    }

    /** Empreinte de déduplication d'un mail. */
    static fingerprint(fromEmail: string | null, date: string | null, subject: string | null, body: string): string {
        return djb2Hash(`${fromEmail ?? ''}|${date ?? ''}|${subject ?? ''}|${body.slice(0, 200)}`);
    }
}
