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

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Get your API key from: https://aistudio.google.com/app/apikey
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |
| `npm run clean` | Clean build artifacts and cache |

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

The easiest way to deploy is using Vercel:

#### Option 1: Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Add environment variable:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** Your Gemini API key
5. Click **Deploy**

Your app will be live at `https://smartexam-ai.vercel.app`

#### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

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
