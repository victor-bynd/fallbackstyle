# Deploying Localize Type to DigitalOcean

This guide will walk you through deploying your Localize Type application to DigitalOcean App Platform.

## Prerequisites

Before you begin, make sure you have:

- ✅ A [DigitalOcean account](https://www.digitalocean.com/) (free tier available)
- ✅ Your code in a Git repository (GitHub, GitLab, or Bitbucket)
- ✅ Git installed on your local machine

## Deployment Options

### Option 1: DigitalOcean App Platform (Recommended) ⭐

**Best for:** Quick deployment, automatic builds, free tier available

**Cost:** $0/month for static sites (free tier)

**Features:**
- Automatic builds from Git
- Free SSL/HTTPS
- Global CDN
- Automatic deployments on push

👉 **[Jump to App Platform Instructions](#deploying-to-app-platform)**

---

### Option 2: DigitalOcean Droplet (VPS)

**Best for:** Full control, custom server configuration

**Cost:** Starting at $4/month

**Features:**
- Full server access
- Custom configurations
- Can host multiple apps

👉 **[Jump to Droplet Instructions](#deploying-to-droplet-alternative)**

---

## Deploying to App Platform

### Step 1: Push Your Code to Git

If you haven't already, push your code to a Git repository:

\`\`\`bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit your changes
git commit -m "Prepare for DigitalOcean deployment"

# Add your remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/localize-type.git

# Push to GitHub
git push -u origin main
\`\`\`

> [!IMPORTANT]
> Make sure the `.do/app.yaml` file is committed to your repository!

---

### Step 2: Update Configuration File

Before deploying, update the `.do/app.yaml` file:

1. Open `.do/app.yaml`
2. Replace `YOUR_GITHUB_USERNAME/localize-type` with your actual repository path
   - Example: `johndoe/localize-type`
3. Verify the branch name matches your repository (usually `main` or `master`)

\`\`\`yaml
github:
  repo: YOUR_GITHUB_USERNAME/localize-type  # ← Update this!
  branch: main  # ← Verify this matches your branch
\`\`\`

4. Commit and push this change:

\`\`\`bash
git add .do/app.yaml
git commit -m "Update deployment configuration"
git push
\`\`\`

---

### Step 3: Create App on DigitalOcean

1. **Log in to DigitalOcean**
   - Go to [cloud.digitalocean.com](https://cloud.digitalocean.com/)
   - Sign in to your account

2. **Create New App**
   - Click the **"Create"** button in the top right
   - Select **"Apps"** from the dropdown

3. **Connect Your Repository**
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Click **"Authorize DigitalOcean"** and follow the prompts
   - Select your repository: `localize-type`
   - Choose the branch: `main` (or your default branch)
   - Click **"Next"**

4. **Configure Your App**
   - DigitalOcean will automatically detect the `.do/app.yaml` file
   - You should see: ✅ **"App Spec Detected"**
   - Review the configuration:
     - **Name:** localize-type-web
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - Click **"Next"**

5. **Choose Your Plan**
   - Select **"Starter"** (Free for static sites)
   - Click **"Next"**

6. **Review and Launch**
   - Review all settings
   - Click **"Create Resources"**

---

### Step 4: Wait for Deployment

- DigitalOcean will now build and deploy your app
- This typically takes **3-5 minutes**
- You can watch the build logs in real-time

**Build Process:**
1. ✅ Cloning repository
2. ✅ Installing dependencies (`npm install`)
3. ✅ Building application (`npm run build`)
4. ✅ Deploying to CDN

---

### Step 5: Access Your Live App

Once deployment is complete:

1. You'll see a **green checkmark** ✅ next to your app
2. Your app URL will be displayed:
   - Format: `https://localize-type-web-xxxxx.ondigitalocean.app`
3. Click the URL to view your live application!

---

## Post-Deployment Configuration

### Adding a Custom Domain (Optional)

1. In your App Platform dashboard, click **"Settings"**
2. Navigate to **"Domains"**
3. Click **"Add Domain"**
4. Enter your domain name (e.g., `www.yourdomain.com`)
5. Follow the DNS configuration instructions
6. Wait for DNS propagation (can take up to 48 hours)

### Environment Variables (If Needed)

If you need to add environment variables:

1. Go to your app in App Platform
2. Click **"Settings"** → **"App-Level Environment Variables"**
3. Click **"Edit"**
4. Add your variables (format: `KEY=value`)
5. Click **"Save"**
6. Your app will automatically redeploy

---

## Automatic Deployments

Your app is now set up for **automatic deployments**! 🎉

Every time you push to your `main` branch:
1. DigitalOcean detects the change
2. Automatically builds your app
3. Deploys the new version
4. Updates your live site

To deploy changes:

\`\`\`bash
# Make your changes
git add .
git commit -m "Your commit message"
git push

# DigitalOcean will automatically deploy! 🚀
\`\`\`

---

## Deploying to Droplet (Alternative)

If you prefer to deploy to a Droplet (VPS):

### Step 1: Create a Droplet

1. Log in to DigitalOcean
2. Click **"Create"** → **"Droplets"**
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($4/month)
   - **Datacenter:** Closest to your users
4. Add SSH key or use password
5. Click **"Create Droplet"**

### Step 2: Install Node.js and Nginx

SSH into your droplet:

\`\`\`bash
ssh root@YOUR_DROPLET_IP
\`\`\`

Install dependencies:

\`\`\`bash
# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git
\`\`\`

### Step 3: Clone and Build Your App

\`\`\`bash
# Clone your repository
cd /var/www
git clone https://github.com/YOUR_USERNAME/localize-type.git
cd localize-type

# Install dependencies
npm install

# Build for production
npm run build
\`\`\`

### Step 4: Configure Nginx

Create Nginx configuration:

\`\`\`bash
nano /etc/nginx/sites-available/localize-type
\`\`\`

Add this configuration:

\`\`\`nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;
    
    root /var/www/localize-type/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

Enable the site:

\`\`\`bash
ln -s /etc/nginx/sites-available/localize-type /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
\`\`\`

### Step 5: Set Up SSL (Optional but Recommended)

\`\`\`bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com
\`\`\`

---

## Troubleshooting

### Build Fails

**Problem:** Build fails with dependency errors

**Solution:**
\`\`\`bash
# Locally, clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
\`\`\`

Then commit and push the updated `package-lock.json`.

---

### App Shows Blank Page

**Problem:** App deploys but shows a blank page

**Solutions:**
1. Check browser console for errors (F12)
2. Verify `base` URL in `vite.config.js` is set to `'/'`
3. Check that `catchall_document` is set in `.do/app.yaml`

---

### Fonts Not Loading

**Problem:** Custom fonts don't load after deployment

**Solution:**
- Ensure font files are in the `public` folder or properly imported
- Check CORS settings if fonts are hosted externally
- Verify font paths in CSS are correct

---

### Build Takes Too Long

**Problem:** Build process times out

**Solution:**
- Check for large dependencies
- Review `vite.config.js` chunk splitting
- Consider upgrading to a paid plan for more build resources

---

## Testing Production Build Locally

Before deploying, test the production build locally:

\`\`\`bash
# Build for production
npm run build

# Preview the production build
npm run preview
\`\`\`

Visit `http://localhost:4173` to test your production build.

---

## Monitoring and Logs

### View Build Logs

1. Go to your app in App Platform
2. Click on the deployment
3. View real-time build logs

### View Runtime Logs

For static sites, there are no runtime logs (it's just static files served via CDN).

### Monitor Performance

1. In App Platform, click **"Insights"**
2. View metrics:
   - Bandwidth usage
   - Request count
   - Response times

---

## Updating Your Deployment

### Method 1: Git Push (Automatic)

\`\`\`bash
# Make changes
git add .
git commit -m "Update feature"
git push
# Automatically deploys! 🚀
\`\`\`

### Method 2: Manual Trigger

1. Go to App Platform dashboard
2. Click your app
3. Click **"Actions"** → **"Force Rebuild and Deploy"**

---

## Cost Breakdown

### App Platform (Recommended)
- **Static Site:** $0/month (Free tier)
- **Custom Domain:** Free
- **SSL Certificate:** Free
- **Bandwidth:** 100 GB/month included

### Droplet
- **Basic Droplet:** $4/month
- **Bandwidth:** 500 GB/month included
- **SSL Certificate:** Free (via Let's Encrypt)

---

## Additional Resources

- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Vite Production Build Guide](https://vitejs.dev/guide/build.html)
- [DigitalOcean Community Tutorials](https://www.digitalocean.com/community/tutorials)

---

## Need Help?

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review DigitalOcean's build logs for error messages
3. Verify your `.do/app.yaml` configuration
4. Test the production build locally first

---

**🎉 Congratulations!** Your Localize Type app is now live on DigitalOcean!
