# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Google Gemini API Key ([Get it here](https://ai.google.dev/))
- Vercel account (Free tier is sufficient)

### Step 1: Prepare Your Code

1. Ensure your repository is pushed to GitHub
2. Make sure `vercel.json` and `.env.example` are committed

### Step 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `allan1114/smartexam`
4. Vercel will automatically detect **Vite** framework

### Step 3: Configure Environment Variables

In the **Environment Variables** section, add:

| Name | Value | Environment |
|------|-------|-------------|
| `GEMINI_API_KEY` | Your Gemini API key | Production, Preview, Development |

**Get your API key:**
1. Go to [AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy and paste it into Vercel

### Step 4: Deploy

Click **"Deploy"** and wait for the build to complete (2-3 minutes).

Your site will be live at: `https://smartexam-ai.vercel.app` (or your custom domain)

---

## 📦 Deploy via Vercel CLI (Alternative)

### Install Vercel CLI

```bash
npm i -g vercel
```

### Login and Deploy

```bash
# Login to Vercel
vercel login

# Deploy from project root
cd /path/to/smartexam
vercel

# Follow prompts to configure:
# - Link to existing project or create new
# - Set environment variables
# - Confirm deployment
```

### Production Deploy

```bash
vercel --prod
```

---

## 🔧 Troubleshooting

### Build Fails

If you see build errors:

1. **Check Node version:**
   ```bash
   node -v  # Should be v18 or higher
   ```

2. **Update dependencies:**
   ```bash
   npm install
   npm update
   ```

3. **TypeScript errors:**
   ```bash
   npm run type-check
   ```

### API Errors (500 / 401)

- Verify `GEMINI_API_KEY` is set correctly in Vercel Dashboard
- Check that the API key has proper permissions
- Monitor usage limits on [AI Studio](https://aistudio.google.com/)

### Environment Variables Not Working

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Ensure the variable name is exactly `GEMINI_API_KEY` (case-sensitive)
3. Check all environment boxes (Production, Preview, Development)
4. **Redeploy** after adding/changing variables:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on latest deployment
   - Select **Redeploy**

### Wrong Domain

1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `smartexam.yourdomain.com`)
3. Update DNS settings as instructed by Vercel

---

## 🔒 Security Best Practices

1. **Never commit API keys** to your repository
2. Use Vercel Environment Variables instead of `.env` files
3. Enable **Deploy Previews** to test changes before production
4. Monitor usage and set up alerts for API costs
5. Regularly rotate your API keys

---

## 📊 Monitoring

After deployment:

- Monitor build logs in Vercel Dashboard
- Check analytics in [AI Studio](https://aistudio.google.com/)
- Set up error tracking (consider Sentry or similar)
- Monitor Vercel Analytics for performance metrics

---

## 🔄 Auto-Deploy

Your Vercel project is now connected to GitHub. Every time you push to your repository:

1. Vercel automatically triggers a build
2. Creates a preview URL for each commit/PR
3. Production updates when you merge to `main` branch

### Workflow

```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main

# Vercel will automatically deploy!
```

---

## 📝 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/deployment.html)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Vercel Frameworks](https://vercel.com/docs/frameworks)

---

## 💡 Pro Tips

1. **Custom Domain**: Add a professional domain (e.g., `exam.smartstudy.com`)
2. **Analytics**: Enable Vercel Analytics to track user behavior
3. **Caching**: Vercel automatically caches static assets - leverage this
4. **Preview Deployments**: Enable GitHub previews for every PR
5. **Performance**: Monitor Web Vitals in Vercel Analytics

---

**Deployed! 🎉**

Your SmartExam AI is now live and accessible worldwide!
