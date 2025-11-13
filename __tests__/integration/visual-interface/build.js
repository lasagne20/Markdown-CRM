const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class BuildSystem {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../../../');
        this.srcDir = path.join(this.projectRoot, 'src');
        this.outputDir = path.join(__dirname, 'js');
        this.interfaceDir = __dirname;
    }

    async build() {
        console.log('🏗️ Démarrage du build système CRM...');
        console.log(`📁 Source: ${this.srcDir}`);
        console.log(`📁 Output: ${this.outputDir}`);

        try {
            // 1. Clean output directory
            await this.cleanOutput();
            
            // 2. Compile TypeScript sources
            await this.compileTypeScript();
            
            // 3. Copy configs and styles
            await this.copyConfigs();
            await this.copyStyles();
            
            // 4. Start admin server
            await this.startAdminServer();
            
        } catch (error) {
            console.error('❌ Erreur lors du build:', error);
            process.exit(1);
        }
    }

    async cleanOutput() {
        console.log('🧹 Nettoyage du répertoire de sortie...');
        
        if (fs.existsSync(this.outputDir)) {
            await this.executeCommand(`rd /s /q "${this.outputDir}"`, process.cwd());
        }
        
        fs.mkdirSync(this.outputDir, { recursive: true });
        console.log('✅ Répertoire de sortie nettoyé');
    }

    async compileTypeScript() {
        console.log('🔨 Compilation TypeScript des sources du projet...');
        
        // Create tsconfig specifically for the build
        const tsconfigPath = path.join(this.interfaceDir, 'tsconfig.build.json');
        const tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "ES2020", 
                "moduleResolution": "node",
                "esModuleInterop": true,
                "allowSyntheticDefaultImports": true,
                "strict": false,
                "skipLibCheck": true,
                "noEmitOnError": false,
                "outDir": "./js",
                "rootDir": "../../../src",
                "declaration": false,
                "sourceMap": false,
                "resolveJsonModule": true,
                "allowJs": true,
                "noImplicitAny": false
            },
            "include": [
                "../../../src/vault/Vault.ts",
                "../../../src/vault/File.ts",
                "../../../src/vault/Classe.ts",
                "../../../src/interfaces/IApp.ts",
                "../../../src/Config/**/*.ts",
                "../../../src/properties/**/*.ts"
            ],
            "exclude": [
                "../../../src/**/*.test.ts",
                "../../../src/**/*.spec.ts",
                "../../../node_modules/**",
                "../../../**/__tests__/**"
            ]
        };

        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

        try {
            await this.executeCommand(`npx tsc -p "${tsconfigPath}"`, this.interfaceDir);
            console.log('✅ Compilation TypeScript terminée');
        } catch (error) {
            console.log('⚠️ Erreurs de compilation détectées, mais poursuite du build...');
            console.log('Les fichiers compilés avec succès seront utilisés');
        } finally {
            // Cleanup tsconfig
            if (fs.existsSync(tsconfigPath)) {
                fs.unlinkSync(tsconfigPath);
            }
        }
        
        // Fix JS imports to include .js extension
        await this.fixJsImports();
        
        // Fix external dependencies for browser compatibility
        await this.fixExternalDependencies();
    }

    async fixJsImports() {
        console.log('🔧 Correction des imports JS pour ajouter les extensions...');
        
        const fixImportsInFile = (filePath) => {
            if (!fs.existsSync(filePath) || !filePath.endsWith('.js')) {
                return;
            }
            
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;
            
            // Fix imports that don't have .js extension - more precise regex
            content = content.replace(/import\s+(.*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g, (match, importClause, importPath) => {
                // Only fix relative imports that don't already have an extension
                if ((importPath.startsWith('./') || importPath.startsWith('../')) && 
                    !importPath.endsWith('.js') && 
                    !importPath.endsWith('.json') && 
                    !importPath.includes('node_modules') &&
                    importPath !== 'js-yaml' && // Skip external modules
                    importPath !== 'flatpickr') {
                    
                    modified = true;
                    return `import ${importClause} from '${importPath}.js';`;
                }
                return match;
            });
            
            if (modified) {
                fs.writeFileSync(filePath, content);
                console.log(`  ✅ Corrigé: ${path.relative(this.outputDir, filePath)}`);
            }
        };
        
        const walkDirectory = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walkDirectory(fullPath);
                } else if (entry.name.endsWith('.js')) {
                    fixImportsInFile(fullPath);
                }
            }
        };
        
        walkDirectory(this.outputDir);
        console.log('✅ Correction des imports terminée');
    }

    async fixExternalDependencies() {
        console.log('🔧 Correction des dépendances externes pour compatibilité navigateur...');
        
        const fixDependenciesInFile = (filePath) => {
            if (!fs.existsSync(filePath) || !filePath.endsWith('.js')) {
                return;
            }
            
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;
            
            // Replace js-yaml imports with mock
            if (content.includes("import * as yaml from 'js-yaml';")) {
                content = content.replace(
                    "import * as yaml from 'js-yaml';",
                    `// Use js-yaml from CDN (loaded in HTML as window.jsyaml)
const yaml = {
    load: (str) => {
        if (window.jsyaml && window.jsyaml.load) {
            return window.jsyaml.load(str);
        } else {
            console.error('js-yaml not loaded from CDN');
            return {};
        }
    },
    dump: (obj) => {
        if (window.jsyaml && window.jsyaml.dump) {
            return window.jsyaml.dump(obj);
        } else {
            return JSON.stringify(obj, null, 2);
        }
    }
};`
                );
                modified = true;
            }
            
            // Replace js-yaml dump/load imports with CDN version
            if (content.includes("import { dump, load as parseYaml } from 'js-yaml';")) {
                content = content.replace(
                    "import { dump, load as parseYaml } from 'js-yaml';",
                    `// Use js-yaml from CDN (loaded in HTML as window.jsyaml)
const dump = (obj) => {
    if (window.jsyaml && window.jsyaml.dump) {
        return window.jsyaml.dump(obj);
    } else {
        return JSON.stringify(obj, null, 2);
    }
};
const parseYaml = (str) => {
    if (window.jsyaml && window.jsyaml.load) {
        return window.jsyaml.load(str);
    } else {
        try {
            return JSON.parse(str);
        } catch {
            return {};
        }
    }
};`
                );
                modified = true;
            }
            
            // Replace flatpickr imports to use CDN version
            if (content.includes('flatpickr')) {
                // Pattern 1: import flatpickr from "flatpickr"; + optional l10n import
                content = content.replace(
                    /import flatpickr from "flatpickr";\s*import "flatpickr\/dist\/l10n\/fr\.js";?/g,
                    `// Use flatpickr from CDN (loaded in HTML as window.flatpickr)
const flatpickr = window.flatpickr || function(element, options = {}) {
    console.error('Flatpickr not loaded from CDN');
    return { destroy: () => {}, setDate: () => {}, config: options, element: element };
};`
                );
                
                // Pattern 2: import flatpickr from "flatpickr"; (standalone)
                content = content.replace(
                    /import flatpickr from "flatpickr";/g,
                    `// Use flatpickr from CDN (loaded in HTML as window.flatpickr)
const flatpickr = window.flatpickr || function(element, options = {}) {
    console.error('Flatpickr not loaded from CDN');
    return { destroy: () => {}, setDate: () => {}, config: options, element: element };
};`
                );
                
                // Pattern 3: import { French } from "flatpickr/dist/l10n/fr.js";
                content = content.replace(
                    /import\s*\{[^}]*French[^}]*\}\s*from\s*"flatpickr[^"]*";\s*/g,
                    `// Use French locale from CDN (loaded in HTML as window.flatpickr.l10ns.fr)
const French = (window.flatpickr && window.flatpickr.l10ns && window.flatpickr.l10ns.fr) || { firstDayOfWeek: 1 };
`
                );
                
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(filePath, content);
                console.log(`  ✅ Dépendances corrigées: ${path.relative(this.outputDir, filePath)}`);
            }
        };
        
        const walkDirectory = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walkDirectory(fullPath);
                } else if (entry.name.endsWith('.js')) {
                    fixDependenciesInFile(fullPath);
                }
            }
        };
        
        walkDirectory(this.outputDir);
        console.log('✅ Correction des dépendances terminée');
    }

    async copyConfigs() {
        console.log('📋 Copie des configurations...');
        
        // Copy YAML configs to js directory
        const configSrc = path.join(this.interfaceDir, 'config');
        const configDest = path.join(this.outputDir, 'config');
        
        if (fs.existsSync(configSrc)) {
            await this.copyDirectory(configSrc, configDest);
            console.log('✅ Configurations copiées');
        }
    }

    async copyStyles() {
        console.log('🎨 Copie des styles CSS...');
        
        // Copy styles from src/styles to interface directory
        const stylesSrc = path.join(this.srcDir, 'styles');
        const stylesDest = path.join(this.interfaceDir, 'styles');
        
        if (fs.existsSync(stylesSrc)) {
            if (!fs.existsSync(stylesDest)) {
                fs.mkdirSync(stylesDest, { recursive: true });
            }
            
            // Copy all CSS files
            const files = fs.readdirSync(stylesSrc);
            files.forEach(file => {
                if (file.endsWith('.css')) {
                    const srcPath = path.join(stylesSrc, file);
                    const destPath = path.join(stylesDest, file);
                    fs.copyFileSync(srcPath, destPath);
                }
            });
            
            console.log('✅ Styles CSS copiés');
        }
    }

    async copyDirectory(src, dest) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    async killExistingServer() {
        console.log('🔍 Vérification des serveurs existants sur le port 3500...');
        
        try {
            // Check if port 3500 is in use
            const { execSync } = require('child_process');
            const output = execSync('netstat -ano | findstr :3500', { encoding: 'utf8' });
            
            if (output.trim()) {
                console.log('🔪 Arrêt du serveur existant...');
                
                // Extract PID from netstat output
                const lines = output.trim().split('\n');
                const pids = new Set();
                
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 5) {
                        const pid = parts[parts.length - 1];
                        if (pid && !isNaN(pid)) {
                            pids.add(pid);
                        }
                    }
                });
                
                // Kill all processes using port 3500
                for (const pid of pids) {
                    try {
                        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
                        console.log(`✅ Processus ${pid} arrêté`);
                    } catch (e) {
                        // Ignore errors if process is already dead
                    }
                }
                
                // Wait a bit for processes to fully terminate
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('✅ Port 3500 libéré');
            } else {
                console.log('✅ Port 3500 disponible');
            }
        } catch (error) {
            // No processes found on port 3500, which is fine
            console.log('✅ Aucun serveur existant détecté');
        }
    }

    async startAdminServer() {
        console.log('🚀 Démarrage du serveur d\'administration...');
        
        // Kill any existing server first
        await this.killExistingServer();
        
        // Start the admin server
        const serverPath = path.join(this.interfaceDir, 'admin-server.js');
        const { spawn } = require('child_process');
        
        const server = spawn('node', [serverPath], {
            cwd: this.interfaceDir,
            stdio: 'inherit'
        });

        server.on('error', (error) => {
            console.error('❌ Erreur serveur:', error);
        });

        server.on('close', (code) => {
            console.log(`🛑 Serveur fermé avec le code ${code}`);
        });

        // Keep process alive
        process.on('SIGINT', () => {
            console.log('\n👋 Arrêt du build système...');
            server.kill('SIGINT');
            process.exit(0);
        });
    }

    async executeCommand(command, cwd) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd, shell: true }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Erreur commande: ${command}`);
                    console.error('stdout:', stdout);
                    console.error('stderr:', stderr);
                    return reject(error);
                }
                if (stdout) console.log(stdout);
                if (stderr) console.warn(stderr);
                resolve({ stdout, stderr });
            });
        });
    }
}

// Start the build system
const builder = new BuildSystem();
builder.build().catch(console.error);