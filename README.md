# Shortcut Calculator

Professional event and service calculator for Shortcut LLC. This application helps calculate costs and manage proposals for various events and services.

## Features

- Event cost calculation
- Service management
- Proposal generation
- Client management
- Password-protected sharing

## Local Development

### Prerequisites

- Node.js (v20 or higher)
- npm

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open in browser:**
   Navigate to `http://localhost:5173`

The app should now be running locally!

### Troubleshooting

**If the page is blank or doesn't load:**

1. **Open browser DevTools** (F12 or Cmd+Option+I)
2. **Check the Console tab** for JavaScript errors
3. **Check the Network tab** to see if files are loading (look for 404s or failed requests)
4. **Clear browser cache** and hard refresh (Cmd+Shift+R on Mac)

**Common errors:**
- Port conflicts: `pkill -f vite` then try again
- Missing dependencies: `rm -rf node_modules package-lock.json && npm install`
- Environment issues: Check that `public/env-config.js` exists

**If you see a blank white screen:**
This is usually caused by environment variables not loading properly. The fix is to ensure `env-config.js` loads before the main app script. Check `index.html` - the `env-config.js` script tag should NOT have `defer` attribute (it should load synchronously before `main.tsx`).

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Production URL

The application is deployed at: https://proposals.getshortcut.co