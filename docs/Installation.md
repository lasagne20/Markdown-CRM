# Installation Guide

Get Markdown CRM up and running in less than 10 minutes.

## 📋 Prerequisites

Before installing, ensure you have:

- **Node.js 16+** (Check with `node --version`)
- **npm 7+** (Check with `npm --version`)
- **Git** (Optional, for version control)
- **A text editor** (VS Code, Obsidian, or any Markdown editor)

---

## ⚡ Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/markdown-crm.git
cd markdown-crm
```

Or download the ZIP file and extract it.

---

### 2. Install Dependencies

```bash
npm install
```

This installs:
- TypeScript compiler
- Jest testing framework
- js-yaml for YAML parsing
- Type definitions

---

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

---

### 4. Run Tests (Optional but Recommended)

```bash
npm test
```

You should see:
```
Tests:       942 passed, 942 total
```

If all tests pass, you're ready to go! ✅

---

### 5. Create Your First Vault

Create a `vault/` directory in your project:

```bash
mkdir vault
mkdir vault/Contacts
```

---

### 6. Create Your First Config

Create `config/Contact.yaml`:

```yaml
name: Contact
icon: 👤
description: Business contacts

properties:
  - name: fullName
    type: NameProperty
    required: true
  
  - name: email
    type: EmailProperty
  
  - name: phone
    type: PhoneProperty
  
  - name: company
    type: TextProperty
  
  - name: tags
    type: MultiSelectProperty
    options: [Client, Partner, Vendor, VIP]
```

---

### 7. Create Your First Record

Create `vault/Contacts/John Doe.md`:

```markdown
---
fullName: John Doe
email: john@example.com
phone: +1-555-0100
company: Acme Corp
tags: [Client, VIP]
---

# John Doe

Met at conference 2024. Interested in our services.

## Notes
- Follow up next week
- Send proposal by Friday
```

---

### 8. Open the Admin Interface

```bash
npm start
```

Then open your browser to `http://localhost:3000`

You should see your Contact class and John Doe record! 🎉

---

## 🔧 Detailed Installation

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Node.js | 16.0.0 | 18.0.0+ |
| npm | 7.0.0 | 8.0.0+ |
| RAM | 2 GB | 4 GB+ |
| Disk Space | 100 MB | 500 MB+ |
| OS | Windows 10, macOS 10.14, Linux | Any modern OS |

---

### Installation Options

#### Option 1: NPM Package (Coming Soon)

```bash
npm install -g markdown-crm
markdown-crm init my-crm
cd my-crm
markdown-crm start
```

#### Option 2: Clone from GitHub

```bash
git clone https://github.com/yourusername/markdown-crm.git
cd markdown-crm
npm install
npm run build
```

#### Option 3: Download ZIP

1. Download from [Releases](https://github.com/yourusername/markdown-crm/releases)
2. Extract to desired location
3. Run `npm install`
4. Run `npm run build`

---

### Directory Structure

After installation, you should have:

```
markdown-crm/
├── config/              # Class definitions
│   └── Contact.yaml     # Example config
├── vault/               # Your data
│   └── Contacts/        # Contact records
├── src/                 # Source code (TypeScript)
│   ├── Config/          # Configuration system
│   ├── properties/      # Property types
│   ├── vault/           # Vault system
│   └── index.ts         # Main entry point
├── dist/                # Compiled code (JavaScript)
├── __tests__/           # Test suite
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── README.md            # Documentation
```

---

## ⚙️ Configuration

### TypeScript Configuration

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "__tests__"]
}
```

### Jest Configuration

`jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### NPM Scripts

`package.json`:
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "start": "node dist/index.js",
    "dev": "tsc --watch",
    "lint": "eslint src/**/*.ts"
  }
}
```

---

## 🔍 Verification

### Verify Installation

Run these commands to verify everything is working:

```bash
# Check TypeScript compilation
npm run build
# Should see: Successfully compiled

# Check tests
npm test
# Should see: Tests: 942 passed, 942 total

# Check vault structure
ls -la vault/
# Should see: Contacts/ and other class folders

# Check config files
ls -la config/
# Should see: Contact.yaml and other configs
```

---

## 🐛 Troubleshooting

### Error: Cannot find module 'typescript'

**Solution:**
```bash
npm install --save-dev typescript
```

---

### Error: Tests failing

**Solution:**
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install
npm run build
npm test
```

---

### Error: Permission denied

**Solution (macOS/Linux):**
```bash
sudo npm install -g markdown-crm
```

**Solution (Windows):**
Run PowerShell as Administrator

---

### Error: Port 3000 already in use

**Solution:**
```bash
# Kill process using port 3000
# macOS/Linux:
lsof -ti:3000 | xargs kill

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

### TypeScript compilation errors

**Solution:**
```bash
# Ensure tsconfig.json is correct
npm run build -- --diagnostics

# Check for type errors
npx tsc --noEmit
```

---

## 📦 Dependencies

### Runtime Dependencies

```json
{
  "js-yaml": "^4.1.0",     // YAML parsing
  "typescript": "^5.0.0"   // TypeScript runtime
}
```

### Development Dependencies

```json
{
  "@types/jest": "^29.0.0",
  "@types/node": "^18.0.0",
  "@types/js-yaml": "^4.0.5",
  "jest": "^29.0.0",
  "ts-jest": "^29.0.0",
  "eslint": "^8.0.0"
}
```

---

## 🔄 Updating

### Update to Latest Version

```bash
# With npm
npm update markdown-crm

# Or with git
git pull origin main
npm install
npm run build
```

### Check for Updates

```bash
npm outdated
```

---

## 🗑️ Uninstalling

### Remove Global Installation

```bash
npm uninstall -g markdown-crm
```

### Remove Local Installation

```bash
cd markdown-crm
rm -rf node_modules
rm -rf dist
rm package-lock.json
```

### Preserve Your Data

Before uninstalling, **backup your vault**:

```bash
cp -r vault ~/backup-vault
cp -r config ~/backup-config
```

Your data is just plain text files - you can always re-import them!

---

## 🚀 Next Steps

Now that you're installed:

1. **[Your First Class](Your-First-Class.md)** - Create a custom data model
2. **[Property Types](Property-Types.md)** - Learn all field types
3. **[Creating Records](Creating-Records.md)** - Add data
4. **[Admin Interface](Admin-Interface.md)** - Use the visual UI

---

## 💡 Tips

### Use a Markdown Editor

While Markdown CRM has an admin interface, you can also edit files directly:

**Recommended Editors:**
- **Obsidian** - Best for linking and graph view
- **VS Code** - Best for developers
- **Typora** - Best for writing
- **Any text editor** - It's just plain text!

### Enable Version Control

Track changes with Git:

```bash
cd markdown-crm
git init
echo "node_modules/" > .gitignore
echo "dist/" >> .gitignore
git add .
git commit -m "Initial CRM setup"
```

Now every change is tracked and reversible!

### Backup Strategy

Set up automatic backups:

**Option 1: Git + GitHub**
```bash
git remote add origin https://github.com/yourusername/my-crm.git
git push -u origin main
```

**Option 2: Dropbox/iCloud**
```bash
ln -s ~/Dropbox/markdown-crm-backup vault
```

**Option 3: Cron Job**
```bash
# Add to crontab
0 */6 * * * cd /path/to/markdown-crm && tar -czf ~/backups/crm-$(date +\%Y\%m\%d-\%H\%M).tar.gz vault config
```

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the docs** - [Read the wiki](Home.md)
2. **Search issues** - [GitHub Issues](https://github.com/yourusername/markdown-crm/issues)
3. **Ask the community** - [Discord](https://discord.gg/markdown-crm)
4. **Report a bug** - [File an issue](https://github.com/yourusername/markdown-crm/issues/new)

---

**Ready to build your CRM?** → [Your First Class](Your-First-Class.md)
