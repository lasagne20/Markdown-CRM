const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

class AdminServer {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../../../');
        this.interfaceDir = __dirname;
        this.jsDir = path.join(__dirname, 'js');
    }

    async start() {
        console.log('🚀 Démarrage du serveur d\'administration CRM...');
        console.log(`📁 Répertoire du projet: ${this.projectRoot}`);
        console.log(`📁 Répertoire interface: ${this.interfaceDir}`);
        console.log(`📁 Répertoire JS compilé: ${this.jsDir}`);

        try {
            // Check if JS files exist
            await this.checkCompiledFiles();
            
            // Start HTTP server directly
            await this.startHttpServer();
        } catch (error) {
            console.error('❌ Erreur lors du démarrage:', error);
        }
    }

    async checkCompiledFiles() {
        console.log('� Vérification des fichiers JS compilés...');
        
        if (!fs.existsSync(this.jsDir)) {
            throw new Error(`Répertoire JS non trouvé: ${this.jsDir}\nVeuillez exécuter le build d'abord.`);
        }

        const requiredFiles = [
            'vault/Vault.js',
            'vault/Classe.js', 
            'vault/File.js',
            'interfaces/IApp.js'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.jsDir, file);
            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ Fichier manquant: ${file}`);
            }
        }

        console.log('✅ Vérification des fichiers terminée');
    }

    async startHttpServer() {
        const http = require('http');
        const url = require('url');
        
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        const port = 3500;
        
        server.listen(port, () => {
            console.log(`🌐 Serveur d'administration lancé sur http://localhost:${port}`);
            console.log(`📋 Interface d'administration: http://localhost:${port}/admin.html`);
            
            // Open browser automatically
            this.openBrowser(`http://localhost:${port}/admin.html`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`❌ Port ${port} déjà utilisé. Essayez de fermer les autres serveurs.`);
            } else {
                console.error('❌ Erreur serveur:', err);
            }
        });
    }

    handleRequest(req, res) {
        let pathname = url.parse(req.url).pathname;
        // Décoder l'URL pour gérer les espaces et caractères spéciaux
        pathname = decodeURIComponent(pathname);
        let filePath;

        // Handle POST request for writing files
        if (req.method === 'POST' && pathname === '/write-file') {
            this.handleWriteFile(req, res);
            return;
        }

        // Route mapping
        switch (pathname) {
            case '/':
            case '/admin':
                filePath = path.join(this.interfaceDir, 'admin.html');
                break;
            case '/admin.html':
                filePath = path.join(this.interfaceDir, 'admin.html');
                break;
            case '/admin-interface.js':
                filePath = path.join(this.interfaceDir, 'admin-interface.js');
                break;
            case '/main.js':
                filePath = path.join(this.interfaceDir, 'main.js');
                break;
            case '/FakeApp.js':
                filePath = path.join(this.interfaceDir, 'FakeApp.js');
                break;
            default:
                // Check if it's a compiled JS file from vault
                if (pathname.startsWith('/js/')) {
                    filePath = path.join(this.jsDir, pathname.substring(4));
                } else if (pathname.startsWith('/config/')) {
                    // Serve YAML configuration files
                    filePath = path.join(this.interfaceDir, 'config', pathname.substring(8));
                } else if (pathname.startsWith('/vault/')) {
                    // Serve markdown files from vault directory
                    filePath = path.join(this.interfaceDir, pathname.substring(1));
                } else {
                    // Serve static files from interface directory
                    filePath = path.join(this.interfaceDir, pathname.substring(1));
                }
        }

        // Security check
        if (!filePath.startsWith(this.interfaceDir)) {
            this.sendError(res, 403, 'Accès interdit');
            return;
        }

        // Check if file exists
        console.log(`Tentative de lecture: ${filePath}`);
        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log(`❌ Fichier non trouve: ${filePath}`);
                    this.sendError(res, 404, 'Fichier non trouvé: ' + pathname);
                } else {
                    console.log(`❌ Erreur serveur: ${err.message}`);
                    this.sendError(res, 500, 'Erreur serveur');
                }
                return;
            }

            const ext = path.extname(filePath);
            const contentType = this.getContentType(ext);
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end(content);
            
            console.log(`✅ ${req.method} ${pathname} - ${contentType} (${content.length} bytes)`);
        });
    }

    handleWriteFile(req, res) {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { path: filePath, content } = JSON.parse(body);
                
                console.log(`💾 Écriture dans le fichier: ${filePath}`);
                
                // Ensure directory exists
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                // Write file
                fs.writeFileSync(filePath, content, 'utf8');
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    success: true, 
                    message: `Fichier écrit avec succès: ${filePath}` 
                }));
                
                console.log(`✅ Fichier écrit avec succès: ${filePath}`);
                
            } catch (error) {
                console.error(`❌ Erreur lors de l'écriture:`, error);
                res.writeHead(500, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: error.message 
                }));
            }
        });
    }

    getContentType(ext) {
        const types = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.yaml': 'text/yaml',
            '.yml': 'text/yaml',
            '.md': 'text/markdown'
        };
        return types[ext] || 'text/plain';
    }

    sendError(res, statusCode, message) {
        res.writeHead(statusCode, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Erreur ${statusCode}</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                        text-align: center; 
                        padding: 50px; 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .error { 
                        background: rgba(255,255,255,0.1); 
                        padding: 30px; 
                        border-radius: 15px;
                        display: inline-block;
                    }
                </style>
            </head>
            <body>
                <div class="error">
                    <h1>⚠️ Erreur ${statusCode}</h1>
                    <p>${message}</p>
                    <a href="/admin.html" style="color: white;">← Retour à l'interface</a>
                </div>
            </body>
            </html>
        `);
    }

    openBrowser(url) {
        const commands = {
            win32: `start ${url}`,
            darwin: `open ${url}`,
            linux: `xdg-open ${url}`
        };

        const command = commands[process.platform];
        if (command) {
            setTimeout(() => {
                exec(command, (err) => {
                    if (err) {
                        console.log(`⚠️ Impossible d'ouvrir le navigateur automatiquement.`);
                        console.log(`🌐 Ouvrez manuellement: ${url}`);
                    } else {
                        console.log(`🌐 Navigateur ouvert sur l'interface d'administration`);
                    }
                });
            }, 1500);
        } else {
            console.log(`🌐 Ouvrez votre navigateur sur: ${url}`);
        }
    }
}

// Start the server
const server = new AdminServer();
server.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Arrêt du serveur d\'administration...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Arrêt du serveur d\'administration...');
    process.exit(0);
});