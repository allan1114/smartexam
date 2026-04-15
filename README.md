<div align="center">
  <img width="1200" height="475" alt="SmartExam AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SmartExam AI - Your Personal Tutor

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?logo=vite)
![Gemini AI](https://img.shields.io/badge/Gemini%20AI-Latest-8E75FF?logo=google)

**AI-Powered Exam Practice & Learning Platform**

[Live Demo](https://smartexam-ai.vercel.app) • [Report Bug](../../issues) • [Request Feature](../../issues)

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

### Standard Installation

```bash
# Clone the repository
git clone https://github.com/allan1114/smartexam.git
cd smartexam

# Install dependencies
npm install

# Start development server
npm run dev
```

### Using Yarn

```bash
# Install dependencies with yarn
yarn install

# Start development server
yarn dev
```

### Docker (Optional)

```bash
# Build Docker image
docker build -t smartexam .

# Run container
docker run -p 3000:3000 -e GEMINI_API_KEY=your_key_here smartexam
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

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |
| `npm run test` | Run test suite |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Lint code |
| `npm run clean` | Clean build artifacts |

**Quick Start Command:**
```bash
npm run dev  # Start at http://localhost:3000 (or 3001/5173 if port occupied)
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

```
Location: Settings → API Key section
Type: Password input (encrypted display)
Persists: Yes (localStorage)
```

#### 🤖 AI Model Selection
- **Gemini 3 Flash** (Default) - Fast & efficient, best for general use
- **Gemini 2.0 Flash** - Balanced performance and quality
- **Gemini 2.0 Pro** - Advanced model for complex tasks
- **Gemini 2.0 Flash Experimental** - Latest experimental features

```
Location: Settings → AI Model section
Type: Dropdown selector
Persists: Yes (localStorage)
Affects: Question generation, analysis, chatbot
```

#### 🔄 Proxy Configuration (Production)
- **Enable API Proxy**: Use backend proxy for production deployments
- **Proxy URL**: Configure custom proxy endpoint
- **Benefits**: API key stays hidden from browser, rate limiting, monitoring

```
Location: Settings → Proxy Configuration section
Type: Toggle + URL input
Persists: Yes (localStorage)
Recommended for: Production deployments
```

#### 📋 Log Level Configuration
- **DEBUG**: All messages (development)
- **INFO**: General information
- **WARN**: Warnings only (production default)
- **ERROR**: Errors only

```
Location: Settings → Log Level section
Type: Dropdown selector
Persists: Yes (localStorage)
Check logs in: Browser DevTools → Console
```

### Settings Features

✅ **Persistent Storage** - Settings saved in localStorage  
✅ **Real-time Validation** - Instant feedback on inputs  
✅ **Reset Option** - One-click reset to defaults  
✅ **Save Confirmation** - Visual feedback when settings saved  
✅ **Dark Mode Support** - Settings panel adapts to theme  

### Example Settings Workflow

```
1. Click ⚙️ Settings button
2. Paste your Gemini API key
3. Select preferred AI model
4. Enable proxy if using production deployment
5. Adjust log level for debugging (optional)
6. Click "Save Settings"
7. Settings persist automatically
```

### How It Works

- **Dynamic Configuration**: All AI calls automatically use settings from localStorage
- **Environment Fallback**: If no localStorage key exists, falls back to `VITE_GEMINI_API_KEY` env var
- **No Code Changes Required**: Update settings without rebuilding

### API Key Priority

Settings panel checks API keys in this order:
1. localStorage (user-configured in Settings)
2. Environment variable (`VITE_GEMINI_API_KEY`)
3. Error if none found

This allows:
- Development with env vars
- Users to override with Settings panel
- Production deployment with backend proxy

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
   - Review each question with explanations

### Exam Modes Explained

#### 📝 Mock Mode
- Timed exam simulation
- No feedback during exam
- Automatic submission when time expires
- Best for exam preparation

#### 🎯 Practice Mode
- Instant feedback after each question
- Detailed explanations and evidence
- No time limit
- Best for learning and improvement

#### 📚 Study Guide Mode
- Focus on understanding concepts
- Unlimited time
- Detailed AI insights
- Best for deep learning

### Managing Exam History

- View past exam results
- Compare performance over time
- Delete individual exams
- Clear all history
- Export/import exam data

---

## 🏗️ Deployment

### Deploy to Vercel (Recommended)

The easiest way to deploy is using Vercel with secure API key handling:

#### Step 1: Prepare Your Repository

```bash
# Make sure you're using proxy mode for production
git commit -m "Enable API proxy mode for production"
git push
```

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. **Important:** Add **server-side** environment variable:
   - Click **"Environment Variables"**
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your Gemini API key
   - **Scope:** Production (not client-side!)
5. Click **Deploy**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (adds environment variables interactively)
vercel

# Or deploy to production with environment variable
vercel --prod --env GEMINI_API_KEY=your_api_key_here
```

#### Verify Secure Deployment

After deployment, verify your API key is NOT exposed:

```bash
# Check build output for API key leaks
curl https://your-app.vercel.app
# Search page source for "GEMINI_API_KEY" - should be EMPTY ✅
```

Your app will be live at `https://smartexam-ai.vercel.app` with secure API proxy!

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

### Deploy to Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### Deploy to Other Platforms

This app is a standard Vite application and can be deployed to any static hosting service:

- **GitHub Pages**: Use `vite-plugin-gh-pages`
- **AWS S3 + CloudFront**: Upload `dist/` folder
- **Firebase Hosting**: Run `firebase deploy`
- **Heroku**: Add a simple `package.json` start script

---

## 📖 Documentation

### Project Structure

```
smartexam/
├── src/
│   ├── components/        # React components
│   │   ├── Home.tsx      # Home page with file upload
│   │   ├── ExamSetup.tsx # Exam configuration
│   │   ├── ExamPortal.tsx # Main exam interface
│   │   ├── Results.tsx   # Results and analysis
│   │   ├── ChatBot.tsx   # AI tutor chat
│   │   ├── Header.tsx    # App header
│   │   └── LoadingScreen.tsx
│   ├── services/
│   │   └── geminiService.ts  # AI service integration
│   ├── types.ts          # TypeScript type definitions
│   ├── App.tsx           # Main app component
│   └── index.tsx         # Entry point
├── public/               # Static assets
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Project dependencies
├── DEPLOYMENT.md         # Detailed deployment guide
├── IMPROVEMENTS.md       # Project improvements
└── README.md             # This file
```

### Tech Stack

- **Framework**: React 19.2.3 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI Provider**: Google Gemini API (@google/genai)
- **Styling**: Tailwind CSS (via CDN)
- **State Management**: React Hooks
- **Deployment**: Vercel

### API Integration

The app uses Google Gemini API for:
- Question extraction from documents
- Real-time feedback generation
- Performance analysis
- AI tutoring chat

### Key Features Implementation

1. **Document Processing**
   - File upload with FileReader API
   - Google Docs API integration
   - Text content extraction

2. **AI Question Generation**
   - Structured prompts for consistent output
   - JSON schema validation
   - Retry logic for reliability

3. **User Interface**
   - Responsive design patterns
   - Dark mode implementation
   - Progress tracking
   - Interactive components

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Reporting Bugs

- Use [GitHub Issues](../../issues)
- Include detailed steps to reproduce
- Provide screenshots if applicable
- Specify your environment (OS, browser, Node version)

### Suggesting Features

- Use [GitHub Issues](../../issues) with the "enhancement" label
- Describe the use case clearly
- Explain why it would be valuable

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Run tests (`npm test` when available)
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/smartexam.git

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/my-feature

# Make your changes
# ...

# Run type checking
npm run type-check

# Build and test locally
npm run build
npm run preview

# Commit and push
git add .
git commit -m "Add my feature"
git push origin feature/my-feature

# Open a Pull Request
```

### Code Style Guidelines

- Use TypeScript for all new code
- Follow existing code style
- Add comments for complex logic
- Update documentation for new features
- Write tests for new functionality

---

## 🔒 Security Best Practices

### API Key Security

#### Development Environment
```bash
# ✅ SAFE: Use environment variables
VITE_GEMINI_API_KEY=sk_...

# ❌ UNSAFE: Never hardcode keys
const API_KEY = "sk_...";

# ❌ UNSAFE: Never commit .env file
git add .env  # DON'T DO THIS
```

#### Production Environment

**Always use the backend proxy method:**

1. **Add API key as server-side environment variable in Vercel:**
   - Dashboard → Project → Settings → Environment Variables
   - Set `GEMINI_API_KEY` with scope: **Production** only
   - Never expose to client

2. **Verify deployment security:**
   ```bash
   curl https://your-app.vercel.app > page.html
   grep -i "api_key\|vite_gemini" page.html
   # Should return nothing (✅ secure)
   ```

3. **Monitor usage:**
   - Enable Vercel Analytics
   - Check Google Cloud Console for quota usage
   - Set up billing alerts

### Data Security

- ✅ Exam history is stored locally (no cloud)
- ✅ No user personal data collected
- ✅ All API calls go through secure HTTPS
- ✅ Input validation on all document uploads

### Dependencies Security

```bash
# Regular security audits
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

### Rate Limiting

The proxy includes built-in rate limiting:
- 100 requests per hour per IP
- Configurable in `api/proxy-gemini.ts`
- Returns 429 status for exceeded limits

### Compliance

- GDPR compliant (no data storage)
- No tracking pixels or analytics
- MIT licensed (open source)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for providing the AI capabilities
- [Vite](https://vitejs.dev/) for the amazing build tool
- [React](https://react.dev/) for the UI framework
- [Tailwind CSS](https://tailwindcss.com/) for styling utilities

---

## 📞 Support

If you need help:

- 📧 Email: [likwokwa@gmail.com](mailto:likwokwa@gmail.com)
- 🐛 Issues: [GitHub Issues](../../issues)
- 📖 Docs: [Project Wiki](../../wiki)

---

## 🌟 Star History

If you find this project helpful, please consider giving it a star! ⭐

---

<div align="center">

**Built with ❤️ and AI**

[⬆ Back to Top](#-readme)

</div>
