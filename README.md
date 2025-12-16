# Markdown CRM

<div align="center">

![Markdown CRM Logo](https://img.shields.io/badge/Markdown-CRM-blue?style=for-the-badge&logo=markdown)

**A Robust, Offline-First, Fully Customizable CRM Alternative Built on Plain Text**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-1081%20passing-brightgreen.svg)](/__tests__)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen.svg)](coverage)

[Features](#features) • [Why Markdown CRM?](#why-markdown-crm) • [Getting Started](#getting-started) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## 📢 Latest Updates

### ✨ December 2025

- **🧬 Class Inheritance** - New feature: classes can extend other classes with `extend` keyword
- **📋 Property Reuse** - Share common properties across related classes
- **🎯 Multi-Level Inheritance** - Support for inheritance chains (grandparent → parent → child)
- **⚙️ Configuration Inheritance** - Automatically inherit `autoRename`, `parent`, `populate`, and `display` settings

### ✨ November 2025

- **🎯 Populate Feature** - Interactive file creation with property prompts
- **🔒 Static Properties** - New feature: mark fields as non-editable with `static: true`
- **📊 Dataset Expansion** - 36,360 French territories (regions, departments, communes)
- **✅ Test Suite** - 1,081 tests passing (100% success rate)
- **🐛 Bug Fixes** - Multiple test corrections and improvements

[See full changelog](CHANGELOG.md) • [Read populate docs](docs/Populate-Feature.md) • [Read static properties docs](docs/Static-Properties.md)

---

## 🎯 Why Markdown CRM?

**Break free from vendor lock-in.** Traditional CRMs trap your data in proprietary formats, charge monthly fees, and force you to work online. Markdown CRM is different:

- **🔒 Your Data, Your Control** - Everything stored in plain Markdown files you own forever
- **💻 100% Offline** - Work anywhere, anytime, no internet required
- **🎨 Infinitely Customizable** - Build your CRM exactly how you want it
- **🚀 Lightning Fast** - Native performance, no cloud lag
- **🔐 Private & Secure** - Your data never leaves your machine
- **💰 Zero Subscription Fees** - Pay once, use forever
- **🔄 Future-Proof** - Plain text will outlive any proprietary format

## ✨ Features

### 🏗️ Dynamic Property System

Create custom fields for any data type:

- **🔑 Unique Identifiers** - Auto-generated UUIDs for stable references
- **📝 Text & Rich Text** - Single or multi-line with autocomplete
- **📧 Email & Phone** - Validated contact fields
- **📅 Date & Time** - Single dates, ranges, and timestamps
- **🔢 Numbers & Ratings** - With min/max validation and custom units
- **✅ Boolean & Select** - Simple toggles and dropdown options
- **🏷️ Multi-Select** - Tags and categories
- **🔗 Links & References** - Connect related records with WikiLinks
- **📎 File Attachments** - Link documents, images, and media
- **📊 Objects & Nested Data** - Complex structured data
- **🧮 Formulas** - Calculated fields with custom logic
- **🔒 Static Properties** - Mark fields as non-editable after creation
- **🚀 Interactive Populate** - Prompt users for values during file creation

### 🎭 Type-Safe Architecture

- **Dynamic Class Factory** - Generate classes from YAML configurations
- **Class Inheritance System** - Classes can extend other classes to share properties
- **Runtime Type Validation** - Catch errors before they happen
- **Property Inheritance** - Share configurations across classes
- **Extensible System** - Add new property types easily
- **Static Field Support** - Protect critical fields from modification
- **Populate Manager** - Guide users through data entry with smart prompts
- **Legacy File Migration** - Automatic migration of files with different property names

### 🗂️ Flexible Data Organization

- **Class-Based Structure** - Organize data by Contacts, Projects, Tasks, etc.
- **Hierarchical Folders** - Nested organization matching your workflow
- **Cross-References** - Link any record to any other record
- **Multi-File Properties** - Many-to-many relationships

### 🎨 Visual Interface

- **Admin Panel** - Manage classes and configurations
- **File Browser** - Navigate your data with ease
- **Property Inspector** - View and edit all fields
- **Markdown Editor** - Full-featured content editing
- **Inline Editing** - Click to edit, auto-save

## 🏆 Robustness & Reliability

### Production-Ready

- **1,292 Passing Tests** - Comprehensive test coverage (100% success rate)
- **Type-Safe** - Written in TypeScript with strict checks
- **Error Handling** - Graceful degradation and recovery
- **Data Integrity** - Validated writes, atomic operations
- **Lock Mechanism** - Prevents concurrent write conflicts

### Battle-Tested

- **YAML Frontmatter** - Industry-standard metadata format
- **js-yaml** - Robust YAML parsing and serialization
- **Obsidian-Compatible** - Works with existing Markdown tools
- **Version Control Ready** - Git-friendly plain text

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Any text editor (VS Code recommended)
- Optional: Obsidian for enhanced Markdown experience

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/markdown-crm.git
cd markdown-crm

# Install dependencies
npm install

# Build the project and start test interface
npm run build

# Run tests
npm test
```

### Quick Start

1. **Define Your Classes** - Create YAML configurations in `config/`
2. **Generate Classes** - The factory automatically builds typed classes
3. **Create Records** - Use the admin interface or create Markdown files
4. **Link & Organize** - Connect records with WikiLinks
5. **Search & Filter** - Use your favorite Markdown tools

### Example Configuration

```yaml
# config/Contact.yaml
name: Contact
icon: 👤
description: Professional and personal contacts

properties:
  - name: fullName
    type: TextProperty
    title: Full Name
    icon: 📝
    required: true
    
  - name: email
    type: EmailProperty
    title: Email Address
    icon: 📧
    validation:
      pattern: '^[^\s@]+@[^\s@]+\.[^\s@]+$'
      
  - name: company
    type: ObjectProperty
    title: Company Info
    display: inline
    properties:
      - name: name
        type: TextProperty
        title: Company Name
      - name: position
        type: TextProperty
        title: Position
        
  - name: projects
    type: MultiFileProperty
    title: Related Projects
    linkClass: Project
```

### Example Record

```markdown
---
fullName: John Doe
email: john@example.com
company:
  name: Acme Corp
  position: CTO
projects:
  - "[[/Projects/Website Redesign.md|Website Redesign]]"
  - "[[/Projects/Mobile App.md|Mobile App]]"
tags: [client, vip, technology]
priority: High
lastContact: 2025-01-15
---

# John Doe

## Meeting Notes

Met at Tech Conference 2024. Very interested in our services.

## Next Steps

- [ ] Send proposal by end of week
- [ ] Schedule follow-up call
```

## 📚 Documentation

**Comprehensive documentation is available in the [docs](docs/) folder:**

### 📖 Getting Started

- **[📘 Home](docs/Home.md)** - Complete guide to Markdown CRM, architecture, and philosophy
- **[🚀 Installation](docs/Installation.md)** - Setup instructions and getting started
- **[🎯 Why Markdown CRM?](docs/Why-Markdown-CRM.md)** - Vision, philosophy, and comparison with traditional CRMs

### 🔧 Technical Documentation

- **[🏗️ Architecture](docs/Architecture.md)** - System architecture, components, and design patterns
- **[🎨 Property Types](docs/Property-Types.md)** - Complete reference for all 20+ property types

### 📚 Full Documentation

> **[View Full Documentation](docs/Home.md)** - Start here for the complete guide

## 🛠️ Development

### Project Structure

```
markdown-crm/
├── src/
│   ├── Config/           # Configuration loaders
│   ├── properties/       # Property implementations
│   ├── vault/           # File system operations
│   └── interfaces/      # TypeScript interfaces
├── __tests__/           # Test suites
│   ├── Properties/      # Property tests
│   ├── vault/          # Vault tests
│   └── integration/    # Integration tests
├── config/             # Class definitions
└── dist/              # Compiled JavaScript
```

### Available Scripts

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run build         # Compile TypeScript
npm run build:watch   # Compile in watch mode
```

### Testing

We maintain 95%+ code coverage with 942 passing tests:

- **Unit Tests** - Every property and method
- **Integration Tests** - End-to-end workflows
- **Type Tests** - TypeScript compilation
- **DOM Tests** - UI component rendering

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Areas We Need Help

- 🌐 Internationalization (i18n)
- 📱 Mobile optimization
- 🎨 Themes and styling
- 📝 Documentation and examples
- 🐛 Bug reports and fixes
- ✨ New property types

## 📊 Comparison with Traditional CRMs

| Feature | Markdown CRM | Salesforce | HubSpot | Monday.com |
|---------|-------------|------------|---------|------------|
| **Price** | Free | $25-300+/user/mo | $45-450+/user/mo | $8-16+/user/mo |
| **Offline** | ✅ Full | ❌ Limited | ❌ Limited | ❌ No |
| **Data Ownership** | ✅ 100% | ❌ Locked-in | ❌ Locked-in | ❌ Locked-in |
| **Customization** | ✅ Unlimited | ⚠️ Complex | ⚠️ Limited | ⚠️ Templates |
| **Privacy** | ✅ Local | ❌ Cloud | ❌ Cloud | ❌ Cloud |
| **Speed** | ✅ Instant | ⚠️ Depends | ⚠️ Depends | ⚠️ Depends |
| **Learning Curve** | ⚠️ Medium | ❌ Steep | ⚠️ Medium | ✅ Easy |
| **Export** | ✅ Always | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |


## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [TypeScript](https://www.typescriptlang.org/)
- Powered by [js-yaml](https://github.com/nodeca/js-yaml)
- Inspired by [Obsidian](https://obsidian.md/)
- Tested with [Jest](https://jestjs.io/)

## 💬 Community & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/markdown-crm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/markdown-crm/discussions)
- **Email**: support@markdown-crm.com

---

<div align="center">

**Built with ❤️ for those who value their data and privacy**

</div>