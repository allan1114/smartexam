# SmartExam AI - Your Personal Tutor

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Latest-8E75FF?logo=google)

**AI-Powered Exam Practice & Learning Platform**

[Live Demo](https://allan1114.github.io/smartexam/) • [Report Bug](../../issues) • [Request Feature](../../issues)

</div>

---

## 📚 Table of Contents

- [🌟 Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [🎯 Usage](#-usage)
- [🏗️ Deployment](#️-deployment)
- [📖 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🌟 Features

### 🎓 Smart Exam Generation
- **AI-Powered Question Extraction**: Automatically generate practice questions from any document
- **Multiple Input Sources**: Upload files (PDF, TXT, images), import Google Docs, or paste text directly
- **Customizable Exam Modes**:
  - 📝 **Mock Mode**: Timed exam simulation with automatic submission
  - 🎯 **Practice Mode**: Instant feedback after each question
  - 📚 **Study Guide Mode**: Focus on learning with detailed explanations

### 🧠 Advanced AI Features
- **Real-time Analysis**: Get instant AI feedback on your performance
- **Topic-Based Tracking**: Monitor your progress by subject area
- **Mastery Insights**: Deep-dive explanations powered by Gemini AI
- **Grounded Evidence**: Every answer includes source quotes from your document
- **🎯 Level 3 - Smart Retake** (NEW!):
  - **Difficulty Tracking**: Automatically categorizes questions as EASY/MEDIUM/HARD
  - **Smart Question Ordering**: Prioritizes weak areas for focused practice
  - **Topic Mastery Metrics**: Shows mastery percentage by topic
  - **Persistent Performance**: Tracks performance across multiple retakes
  - **Targeted Learning**: Retake focuses on hard questions first

### 🎨 User Experience
- 🌙 **Dark Mode**: Full dark mode support
- 📱 **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- 📊 **Progress Tracking**: Visual progress bars and history management
- 🏆 **Performance Analytics**: Detailed statistics and improvement recommendations
- 💾 **Local Storage**: Your exam history is saved automatically

### 🔧 Customization Options
- **Flexible Question Formats**: MCQ (4/5 options), True/False, or Auto-detect
- **Adjustable Settings**:
  - Question count (1-100)
  - Exam duration (30-240 minutes)
  - Question order (Sequential/Random)
  - Content range focus (specific pages or chapters)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** or **yarn**
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### 3 Steps to Get Started

```bash
# 1. Clone the repository
git clone https://github.com/allan1114/smartexam.git
cd smartexam

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# 4. Start the development server
npm run dev
```

Your app will be available at [http://localhost:3000](http://localhost:3000)

---

## 📦 Installation

### Monorepo Structure

SmartExam is now a **monorepo** supporting both **Web** and **Desktop (Electron)** applications with shared core code:

```
packages/
├── core/          # Shared code (components, types, utils, services)
├── web/           # React Web Application (Vite)
└── desktop/       # Electron Desktop Application
```

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/allan1114/smartexam.git
cd smartexam

# 2. Install dependencies (all workspaces)
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY
```

---

## ⚙️ Configuration

### 🔐 API Key Management

SmartExam supports two secure ways to configure your Gemini API key:

#### Method 1️⃣: Direct API Key (Development)

For local development only. API key is exposed to browser:

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Add your Gemini API key
echo "VITE_GEMINI_API_KEY=your_gemini_api_key_here" >> .env.local

# 3. Start dev server
npm run dev
```

**⚠️ Security Warning:** Never commit `.env.local` to version control. The API key will be visible to users in browser DevTools.

---

#### Method 2️⃣: Backend Proxy (Production - Recommended ⭐)

Use a secure backend proxy to hide your API key:

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Enable proxy mode (development)
echo "VITE_USE_GEMINI_PROXY=true" >> .env.local

# 3. For Vercel deployment, add server-side environment variable:
# Go to Vercel Dashboard → Project Settings → Environment Variables
# Add: GEMINI_API_KEY=your_key_here (server-side only)
```

**Benefits of Proxy Mode:**
- ✅ API key never exposed to browser
- ✅ Request rate limiting
- ✅ API usage auditing
- ✅ Better error handling
- ✅ Production-ready security

---

### Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key"
3. Copy your API key
4. Add it to your environment configuration

---

### Environment Variables Reference

| Variable | Mode | Value | Required |
|----------|------|-------|----------|
| `VITE_GEMINI_API_KEY` | Development | Your API key | Yes (Dev only) |
| `VITE_USE_GEMINI_PROXY` | Both | `true`/`false` | No (Default: false) |
| `VITE_GEMINI_PROXY_URL` | Both | `/api/proxy-gemini` | No (Custom proxy URL) |
| `GEMINI_API_KEY` | Production | Your API key | Yes (Server-side only) |

---

### Available Scripts (Root Level)

| Command | Description | Port |
|---------|-------------|------|
| `npm run dev:web` | Start **Web App** dev server | 3000 |
| `npm run dev:electron` | Start **Electron App** (includes dev server) | 5173 + Electron |
| `npm run build:web` | Build Web App for production | - |
| `npm run build:electron` | Build Electron App (includes installer) | - |
| `npm run test` | Run all tests (core + web) | - |
| `npm run type-check` | TypeScript type checking | - |
| `npm run clean` | Clean all build artifacts | - |
| `npm run install:all` | Install all workspace dependencies | - |

---

## 🌐 WebApp Guide

### Quick Start - Web Version

```bash
# Start development server (port 3000)
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Web Development

```bash
# Watch mode - automatic reload on file changes
npm run dev:web

# Type checking
cd packages/web && npm run type-check

# Run tests
npm test
```

### Web Production Build

```bash
# Build optimized bundle
npm run build:web

# Preview production build
cd packages/web && npm run preview
```

Output: `packages/web/dist/` (Ready to deploy to Vercel, Netlify, etc.)

### Deploy Web App

#### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir packages/web/dist
```

#### Deploy to GitHub Pages

```bash
npm run build:web
# Push packages/web/dist to gh-pages branch
```

---

## 🖥️ Electron (Desktop) Guide

### Quick Start - Electron Desktop App

```bash
# Start Electron development environment
# Runs both Vite dev server and Electron in parallel
npm run dev:electron
```

This will:
1. Start Vite dev server (port 5173)
2. Launch Electron app with dev tools
3. Enable hot reload for React changes

### Electron Development

```bash
# Development with Electron dev tools
npm run dev:electron

# Type checking
cd packages/desktop && npm run type-check

# Run tests
npm test
```

### Electron Production Build

```bash
# Build Electron app (includes macOS .dmg and Windows installer)
npm run build:electron
```

Output:
- **macOS**: `packages/desktop/dist/SmartExam-*.dmg`
- **Windows**: `packages/desktop/dist/SmartExam-*.exe` (NSIS installer + portable)
- **Linux**: `packages/desktop/dist/smartexam-*.AppImage`

### Electron Configuration

Electron build is configured in `packages/desktop/package.json`:

```json
{
  "build": {
    "appId": "com.smartexam.app",
    "productName": "SmartExam",
    "files": ["dist/**/*", "dist-electron/**/*"],
    "dmg": { /* macOS DMG config */ },
    "win": { /* Windows installer config */ }
  }
}
```

Customize in:
- `packages/desktop/package.json` - App metadata and icons
- `packages/desktop/electron/main.ts` - Electron main process
- `packages/desktop/vite.config.ts` - Build configuration

### Building for Specific Platform

```bash
# macOS only
npm run build:electron  # On macOS

# Windows only
npm run build:electron  # On Windows
```

### Distributing Electron App

1. **Sign App** (recommended for macOS)
2. **Host Installer** - Upload to GitHub releases
3. **Auto-updates** - Use electron-updater

---

## 📊 Architecture Comparison

| Feature | Web App | Desktop (Electron) |
|---------|---------|-------------------|
| **Platform** | Browser | Windows, macOS, Linux |
| **Installation** | No (URL-based) | Download & Install |
| **Update** | Automatic | Manual or auto-updater |
| **Storage** | localStorage | File system access |
| **Offline** | Limited | Full offline support |
| **Performance** | Good | Excellent |
| **Bundle Size** | ~600KB | ~150MB (with Electron) |

---

## 🔄 Shared Code (packages/core)

Both web and desktop applications share:

```
packages/core/src/
├── App.tsx              # Main application component
├── components/          # UI components
├── services/           # AI services (Gemini API)
├── types/              # TypeScript types
├── utils/              # Utility functions
├── __tests__/          # Tests
└── constants/          # App constants
```

### Running Core Tests

```bash
# Tests for all shared logic
npm test

# Specific test file
npm test -- difficultyTracking.test.ts

# Test coverage
npm test -- --coverage
```

---

## ⚙️ Settings Panel

SmartExam includes a comprehensive **Settings Panel** for managing configuration without code changes.

### Accessing Settings

Click the **⚙️ Settings button** (gear icon) in the top-right corner of the app header.

### Available Settings

#### 🔐 API Key Management
- **Set/Update API Key**: Enter your Gemini API key directly in the app
- **Validation**: Automatically validates key format
- **Security**: Stored securely in browser localStorage
- **Clear Key**: Option to remove stored key

#### 🤖 AI Model Selection
- **Gemini 3 Flash** (Default)
- **Gemini 2.0 Flash**
- **Gemini 2.0 Pro**
- **Gemini 2.0 Flash Experimental**

#### 🔄 Proxy Configuration (Production)
- **Enable API Proxy**: Use backend proxy for production deployments
- **Proxy URL**: Configure custom proxy endpoint

#### 📋 Log Level Configuration
- **DEBUG**: All messages
- **INFO**: General information
- **WARN**: Warnings only
- **ERROR**: Errors only

### Settings Features

✅ **Persistent Storage** - Settings saved in localStorage
✅ **Real-time Validation** - Instant feedback on inputs
✅ **Reset Option** - One-click reset to defaults
✅ **Dark Mode Support** - Settings panel adapts to theme

---

## 🎯 Usage

### Creating Your First Exam

1. **Upload Your Material**
   - Upload a file (PDF, TXT, or image)
   - Import from Google Docs
   - Or paste text directly

2. **Configure Exam Settings**
   - Choose mode: Mock, Practice, or Study
   - Set question count and duration
   - Select answer format and order

3. **Take the Exam**
   - Answer questions interactively
   - Get instant feedback (Practice/Study modes)
   - Track your progress

4. **Review Results**
   - Detailed performance analysis
   - Topic-based breakdown
   - AI coaching insights

---

## 🏗️ Deployment

### Deploy to GitHub Pages

The easiest way to deploy SmartExam is using GitHub Pages with automatic GitHub Actions deployment:

#### Automatic Deployment (Recommended)

GitHub Actions automatically builds and deploys to GitHub Pages on every push to `main`:

1. Just push to main branch
2. Workflow runs: builds the app and deploys to `https://allan1114.github.io/smartexam/`

#### Manual Deployment

```bash
# Build the web app
npm run build:web

# Deploy to gh-pages branch
git add packages/web/dist -f
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix packages/web/dist origin gh-pages
```

### Deploy to Vercel (Recommended for Production)

The easiest way to deploy is using Vercel with secure API key handling:

#### Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. **Important:** Add **server-side** environment variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your Gemini API key
   - **Scope:** Production (not client-side!)
5. Click **Deploy**

#### Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod --env GEMINI_API_KEY=your_api_key_here
```

#### Verify Secure Deployment

```bash
curl https://your-app.vercel.app
# Search page source - should NOT contain your API key ✅
```

---

## 📖 Documentation

### Project Structure

```
smartexam/
├── packages/
│   ├── core/                    # Shared library
│   ├── web/                     # Web Application (Vite)
│   └── desktop/                 # Electron Desktop App
├── .env.example                 # Environment variables template
├── package.json                 # Root package (workspaces config)
├── README.md                    # This file
└── DEPLOYMENT.md                # Deployment guide
```

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Desktop**: Electron
- **AI**: Google Gemini API
- **Monorepo**: npm workspaces

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

- Use [GitHub Issues](../../issues)
- Include detailed steps to reproduce
- Provide screenshots if applicable

### Suggesting Features

- Use [GitHub Issues](../../issues)
- Describe the use case clearly

### Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Commit and push
6. Open a Pull Request

---

## 🔒 Security Best Practices

### API Key Security

#### Development
```bash
# ✅ SAFE: Use environment variables
VITE_GEMINI_API_KEY=sk_...

# ❌ UNSAFE: Never hardcode keys
const API_KEY = "sk_...";
```

#### Production

**Always use the backend proxy method:**

1. Add API key as server-side environment variable
2. Never expose to client-side code
3. Monitor usage and set billing alerts

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for AI capabilities
- [Vite](https://vitejs.dev/) for the build tool
- [React](https://react.dev/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

---

## 📞 Support

If you need help:

- 📧 Email: [likwokwa@gmail.com](mailto:likwokwa@gmail.com)
- 🐛 Issues: [GitHub Issues](../../issues)

---

<div align="center">

**Built with ❤️ and AI**

</div>
