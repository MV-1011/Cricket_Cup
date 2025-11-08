# Railway Deployment Guide

## Environment Setup

Your application is now fully converted to ES6 modules and ready for Railway deployment!

### Required Environment Variables

Set these in your Railway project settings:

```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
NODE_ENV=production
```

### How It Works

1. **Build Process** (defined in `nixpacks.toml`):
   - Installs backend dependencies
   - Installs frontend dependencies
   - Builds the React frontend (`npm run build`)

2. **Runtime**:
   - Backend server runs on Railway
   - Backend serves both:
     - API endpoints at `/api/*`
     - Frontend static files (built React app)

3. **API Configuration**:
   - **Production**: Frontend uses relative path `/api` (same domain as Railway deployment)
   - **Local Development**: Frontend uses `http://localhost:5022/api` (from `.env.local`)

### Local Development

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

The frontend will run on `http://localhost:3003` and connect to backend on `http://localhost:5022`.

### Deployment Steps

1. Push your code to GitHub
2. In Railway dashboard:
   - Connect your GitHub repository
   - Set environment variable: `MONGODB_URI`
   - Railway will automatically detect and use `nixpacks.toml`
3. Deploy!

Your app will be available at: `https://your-app.up.railway.app`

### Key Files

- `nixpacks.toml` - Railway build configuration
- `railway.json` - Railway deployment settings
- `frontend/.env.local` - Local development API URL (not committed to git)
- `frontend/.env.production` - Production config (empty, uses defaults)
- `backend/server.js` - Serves both API and frontend

### ES6 Module Notes

All backend files now use ES6 imports:
- ✅ `import` instead of `require()`
- ✅ `export` instead of `module.exports`
- ✅ `.js` extensions on all imports
- ✅ `"type": "module"` in `backend/package.json`
