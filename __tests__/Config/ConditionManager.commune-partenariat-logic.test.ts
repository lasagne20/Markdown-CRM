/**
 * @jest-environment jsdom
 */

/**
 * Test pour comprendre et résoudre le problème de l'utilisateur :
 * "Nombre de communes différentes qui ont eu au moins une action avec ce partenariat"
 * 
 * Analyse :
 * - Page courante = un Partenariat (current)
 * - On veut compter les Communes distinctes
 * - Qui ont au moins une Action
 * - Où Action.partenariats contient current (le partenariat courant)
 */

describe('User Problem: Count Communes with Actions having current partenariat', () => {
    describe('Understanding the requirement', () => {
        test('explains what the user really wants', () => {
            console.log('🎯 OBJECTIF DE L\'UTILISATEUR:');
            console.log('');
            console.log('Contexte:');
            console.log('  - Page courante = un Partenariat (ex: "Partenariat ABC")');
            console.log('  - current = ce Partenariat');
            console.log('');
            console.log('Question:');
            console.log('  "Nombre de communes différentes qui ont eu au moins une action');
            console.log('   avec CE partenariat (current)"');
            console.log('');
            console.log('Logique attendue:');
            console.log('  1. Prendre toutes les Communes');
            console.log('  2. Pour chaque Commune, vérifier si elle a au moins une Action');
            console.log('  3. Dans cette Action, vérifier si partenariats contient "Partenariat ABC"');
            console.log('  4. Compter les Communes qui satisfont cette condition');
            console.log('');
            console.log('Schéma:');
            console.log('  Partenariat (current)');
            console.log('    ↓ (contenu dans partenariats)');
            console.log('  Action ← Partenariat');
            console.log('    ↑ (référencée par)');
            console.log('  Commune');
            console.log('');
        });
    });

    describe('Why the current config does not work', () => {
        test('explains why undirectLink with filterCondition does not solve the problem', () => {
            console.log('❌ CONFIGURATION ACTUELLE:');
            console.log('');
            console.log('source:');
            console.log('  class: Commune');
            console.log('  conditions:');
            console.log('    - conditionType: undirectLink');
            console.log('      searchAllFiles: true');
            console.log('      filterCondition:');
            console.log('        property: partenariats');
            console.log('        type: contains');
            console.log('        value: current');
            console.log('');
            console.log('PROBLÈME:');
            console.log('');
            console.log('Cette configuration fait :');
            console.log('  1. Trouver tous les fichiers qui RÉFÉRENCENT la Commune courante');
            console.log('  2. Filtrer pour garder ceux dont partenariats contient current');
            console.log('');
            console.log('Mais ce n\'est PAS ce qu\'on veut !');
            console.log('');
            console.log('On veut:');
            console.log('  1. Prendre TOUTES les Communes (pas juste la courante)');
            console.log('  2. Filtrer les Communes qui ont des Actions');
            console.log('  3. Dans ces Actions, vérifier si partenariats contient current');
            console.log('');
            console.log('❌ La condition undirectLink part de la Commune courante,');
            console.log('   mais on veut évaluer TOUTES les Communes !');
        });
    });

    describe('Correct Solutions', () => {
        test('SOLUTION 1: Use relatedClass with outgoing direction', () => {
            const solution1 = {
                type: 'number',
                source: {
                    class: 'Commune',
                    conditions: [
                        {
                            conditionType: 'relatedClass',
                            relatedClass: 'Action',
                            linkDirection: 'outgoing',  // Commune → Action
                            conditions: [
                                {
                                    property: 'partenariats',
                                    type: 'contains',
                                    value: 'current'
                                }
                            ]
                        }
                    ]
                },
                formula: 'countDistinct',
                propertyName: 'nom',  // ou autre propriété pour compter
                title: 'Nombre de communes desservies'
            };

            console.log('✅ SOLUTION 1: relatedClass (recommandée)');
            console.log('');
            console.log('Logique:');
            console.log('  - Pour chaque Commune');
            console.log('  - Trouver ses Actions (outgoing)');
            console.log('  - Vérifier si Action.partenariats contient current');
            console.log('  - Si oui, garder la Commune');
            console.log('  - Compter les Communes distinctes');
            console.log('');
            console.log(JSON.stringify(solution1, null, 2));
            
            // Valider la structure
            const condition = solution1.source.conditions[0];
            expect(condition.conditionType).toBe('relatedClass');
            expect(condition.relatedClass).toBe('Action');
            expect(condition.linkDirection).toBe('outgoing');
            expect(condition.conditions[0].property).toBe('partenariats');
        });

        test('SOLUTION 2: Use directLink if partenariats is in Commune', () => {
            const solution2 = {
                type: 'number',
                source: {
                    class: 'Commune',
                    conditions: [
                        {
                            conditionType: 'directLink',
                            linkProperty: 'partenariats'  // Si partenariats est dans Commune
                        }
                    ]
                },
                formula: 'count',
                title: 'Nombre de communes avec ce partenariat'
            };

            console.log('✅ SOLUTION 2: directLink (si partenariats est dans Commune)');
            console.log('');
            console.log('Logique:');
            console.log('  - Pour chaque Commune');
            console.log('  - Vérifier si Commune.partenariats contient current');
            console.log('  - Compter les Communes qui satisfont');
            console.log('');
            console.log('À utiliser si la propriété partenariats est DIRECTEMENT dans Commune');
            console.log('');
            console.log(JSON.stringify(solution2, null, 2));
        });

        test('SOLUTION 3: Use property condition if partenariats is direct', () => {
            const solution3 = {
                type: 'number',
                source: {
                    class: 'Commune',
                    conditions: [
                        {
                            property: 'partenariats',
                            type: 'contains',
                            value: 'current'
                        }
                    ]
                },
                formula: 'count',
                title: 'Nombre de communes avec ce partenariat'
            };

            console.log('✅ SOLUTION 3: Property condition (la plus simple)');
            console.log('');
            console.log('Logique:');
            console.log('  - Pour chaque Commune');
            console.log('  - Vérifier si Commune.partenariats contient current');
            console.log('  - Compter les Communes qui satisfont');
            console.log('');
            console.log('À utiliser si partenariats est une propriété simple de Commune');
            console.log('(ex: MultiFileProperty ou SelectProperty)');
            console.log('');
            console.log(JSON.stringify(solution3, null, 2));
        });

        test('SOLUTION 4: Use undirectLink with correct logic for Actions referencing Communes', () => {
            // Si les Actions référencent les Communes (et non l'inverse)
            const solution4 = {
                type: 'number',
                source: {
                    class: 'Commune',
                    conditions: [
                        {
                            conditionType: 'undirectLink',
                            searchAllFiles: true,
                            linkProperty: 'communes',  // Propriété dans Action qui pointe vers Commune
                            filterCondition: {
                                property: 'partenariats',
                                type: 'contains',
                                value: 'current'
                            }
                        }
                    ]
                },
                formula: 'count',
                title: 'Nombre de communes desservies'
            };

            console.log('✅ SOLUTION 4: undirectLink (si Actions référencent Communes)');
            console.log('');
            console.log('Logique:');
            console.log('  - Pour chaque Commune');
            console.log('  - Trouver tous les fichiers qui référencent cette Commune');
            console.log('  - Filtrer pour garder les Actions (linkProperty: communes)');
            console.log('  - Dans ces Actions, vérifier si partenariats contient current');
            console.log('');
            console.log('À utiliser si Action a une propriété "communes" qui pointe vers Commune');
            console.log('');
            console.log(JSON.stringify(solution4, null, 2));
        });
    });

    describe('Decision Tree', () => {
        test('helps choose the right solution based on data structure', () => {
            console.log('🌳 ARBRE DE DÉCISION:');
            console.log('');
            console.log('Question 1: Où se trouve la propriété "partenariats" ?');
            console.log('  ├─ Dans Commune ? → SOLUTION 2 ou 3');
            console.log('  └─ Dans Action ? → SOLUTION 1 ou 4');
            console.log('');
            console.log('Question 2: Comment les Communes sont-elles liées aux Actions ?');
            console.log('  ├─ Commune a une propriété "actions" → SOLUTION 1 (relatedClass outgoing)');
            console.log('  └─ Action a une propriété "communes" → SOLUTION 4 (undirectLink)');
            console.log('');
            console.log('Question 3: Quel est le type de partenariats ?');
            console.log('  ├─ FileProperty/MultiFileProperty → SOLUTION 2 (directLink)');
            console.log('  └─ SelectProperty/MultiSelectProperty → SOLUTION 3 (property condition)');
            console.log('');
            console.log('💡 SOLUTION LA PLUS PROBABLE: SOLUTION 1 (relatedClass)');
            console.log('   car généralement Commune → Action (outgoing)');
            console.log('   et partenariats est dans Action');
        });
    });

    describe('Data Structure Examples', () => {
        test('Example 1: partenariats in Action, Commune has actions', () => {
            console.log('EXEMPLE 1: Structure la plus probable');
            console.log('');
            console.log('Classe: Action');
            console.log('Properties:');
            console.log('  communes: [Commune1, Commune2]  // MultiFileProperty');
            console.log('  partenariats: [PartenariatA, PartenariatB]  // MultiFileProperty');
            console.log('');
            console.log('Classe: Commune');
            console.log('Properties:');
            console.log('  nom: "Commune1"');
            console.log('  actions: [Action1, Action2]  // MultiFileProperty');
            console.log('');
            console.log('→ Utilisez SOLUTION 1 (relatedClass outgoing)');
            console.log('');
        });

        test('Example 2: partenariats directly in Commune', () => {
            console.log('EXEMPLE 2: partenariats dans Commune');
            console.log('');
            console.log('Classe: Commune');
            console.log('Properties:');
            console.log('  nom: "Commune1"');
            console.log('  partenariats: [PartenariatA, PartenariatB]  // MultiFileProperty');
            console.log('');
            console.log('→ Utilisez SOLUTION 2 ou 3 (directLink ou property condition)');
            console.log('');
        });

        test('Example 3: Actions reference Communes', () => {
            console.log('EXEMPLE 3: Actions référencent Communes');
            console.log('');
            console.log('Classe: Action');
            console.log('Properties:');
            console.log('  communes: [Commune1, Commune2]  // MultiFileProperty');
            console.log('  partenariats: [PartenariatA]');
            console.log('');
            console.log('→ Utilisez SOLUTION 4 (undirectLink)');
            console.log('');
        });
    });
});
