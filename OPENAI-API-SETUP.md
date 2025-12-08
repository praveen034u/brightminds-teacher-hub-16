# OpenAI API Key Setup Guide

This guide explains how to configure the OpenAI API key for AI-powered question generation in the BrightMinds Teacher Hub.

## 🔧 Local Development Setup

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click **"Create new secret key"**
4. Copy the API key (starts with `sk-...`)
5. **Important:** Save it securely - you won't be able to see it again!

### Step 2: Configure Environment Variables

1. Open `.env.local` file in the project root
2. Add your OpenAI API key:

```env
VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
```

3. Save the file
4. Restart your development server:

```bash
npm run dev
```

### Step 3: Verify Setup

1. Navigate to **Question Papers** → **Create New Question Paper**
2. Click the **"AI Generation"** tab
3. You should see a green message: "OpenAI API key configured from environment variables"
4. Fill in subject, grade, and topics
5. Click **"Generate Questions with AI"** - it should work without asking for API key!

---

## 🚀 Production/Server Deployment (GitHub Secrets)

### For Vite/React Apps on Vercel, Netlify, or GitHub Pages

#### Option 1: Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name:** `VITE_OPENAI_API_KEY`
   - **Value:** `sk-your-actual-api-key-here`
   - **Environment:** Production, Preview, Development (select as needed)
4. Click **"Save"**
5. Redeploy your application

#### Option 2: Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Build & deploy** → **Environment**
3. Click **"Add a variable"**
4. Add:
   - **Key:** `VITE_OPENAI_API_KEY`
   - **Value:** `sk-your-actual-api-key-here`
5. Click **"Save"**
6. Trigger a new deploy

#### Option 3: GitHub Pages with GitHub Actions

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add:
   - **Name:** `VITE_OPENAI_API_KEY`
   - **Secret:** `sk-your-actual-api-key-here`
5. Click **"Add secret"**

6. Update your GitHub Actions workflow file (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_OPENAI_API_KEY: ${{ secrets.VITE_OPENAI_API_KEY }}
        run: npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## 🔒 Security Best Practices

### ⚠️ Important Security Notes

1. **Never commit API keys to Git**
   - `.env.local` is already in `.gitignore`
   - Always use environment variables for sensitive data

2. **Rotate keys regularly**
   - Change your OpenAI API key every 3-6 months
   - Immediately rotate if you suspect a key has been compromised

3. **Set usage limits**
   - Go to [OpenAI Usage Limits](https://platform.openai.com/account/limits)
   - Set monthly spending limits to prevent unexpected charges
   - Set up billing alerts

4. **Monitor usage**
   - Regularly check [OpenAI Usage Dashboard](https://platform.openai.com/usage)
   - Review API calls and costs

5. **Use different keys for development and production**
   - Create separate API keys for local dev and production
   - This allows you to track usage separately and revoke keys if needed

### 🔐 API Key Restrictions (Recommended)

On OpenAI Platform, restrict your API key:

1. **Set allowed HTTP referrers** (for production key):
   - Add your production domain: `https://yourdomain.com/*`
   - This prevents unauthorized use from other domains

2. **Limit API permissions** (if available):
   - Only enable permissions needed (e.g., `chat.completions`)

---

## 🧪 Testing the Setup

### Test AI Question Generation

1. Create a new question paper
2. Go to **AI Generation** tab
3. Fill in:
   - Subject: Mathematics
   - Grade: 5
   - Topics: Algebra, Fractions
   - Complexity: Medium
   - Count: 5
4. Click **"Generate Questions with AI"**
5. Questions should generate successfully!

### Troubleshooting

#### "API key not configured" error

- **Check:** `.env.local` file has `VITE_OPENAI_API_KEY=sk-...`
- **Check:** Development server was restarted after adding the key
- **Check:** No typos in the variable name (must be exactly `VITE_OPENAI_API_KEY`)

#### "Invalid API key" error

- **Check:** API key is correct (starts with `sk-`)
- **Check:** API key hasn't been revoked on OpenAI platform
- **Check:** Your OpenAI account has available credits

#### Questions not generating

- **Check:** You have credits/billing set up on OpenAI
- **Check:** Network connectivity
- **Check:** Browser console for detailed error messages
- **Check:** OpenAI service status: https://status.openai.com/

---

## 💰 Cost Estimation

OpenAI API costs are based on tokens used:

- **GPT-3.5-Turbo:** ~$0.002 per 1000 tokens (~750 words)
- **GPT-4:** ~$0.03 per 1000 tokens (~750 words)

**Typical question generation:**
- 5 questions ≈ 500-800 tokens
- Cost per generation: $0.001 - $0.02 (depending on model)

**Recommended monthly budget:**
- Light use (50 generations/month): $1-5
- Medium use (200 generations/month): $5-20
- Heavy use (500+ generations/month): $20-50

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [OpenAI Pricing](https://openai.com/pricing)
- [Best Practices for API Key Safety](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety)

---

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify OpenAI API key is valid and has credits
4. Contact support with error details
