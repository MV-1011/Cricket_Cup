# Deployment Guide

## Environment Variables Required

Your deployment platform needs the following environment variables configured:

### Backend Environment Variables

1. **MONGODB_URI** (Required)
   - Your MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/cricket-cup?retryWrites=true&w=majority`
   - Get this from:
     - MongoDB Atlas: https://cloud.mongodb.com/
     - Create a free cluster and get the connection string

2. **PORT** (Optional)
   - The port your backend server will run on
   - Default: `5000`
   - Most platforms set this automatically (Railway uses `8080`)

### How to Set Environment Variables

#### On Railway:
1. Go to your project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Click "New Variable"
5. Add:
   - Key: `MONGODB_URI`
   - Value: `your_mongodb_connection_string`
6. Click "Add" and redeploy

#### On Render:
1. Go to your service dashboard
2. Click "Environment" in the sidebar
3. Add environment variable:
   - Key: `MONGODB_URI`
   - Value: `your_mongodb_connection_string`
4. Save changes (auto-redeploys)

#### On Heroku:
1. Go to your app dashboard
2. Click "Settings" tab
3. Click "Reveal Config Vars"
4. Add:
   - Key: `MONGODB_URI`
   - Value: `your_mongodb_connection_string`

## MongoDB Atlas Setup (Free)

1. Go to https://cloud.mongodb.com/
2. Sign up/Login
3. Create a new project
4. Build a cluster (choose FREE tier - M0)
5. Create a database user:
   - Username: `cricketuser` (or your choice)
   - Password: Generate a secure password
6. Add IP Address:
   - Click "Network Access"
   - Click "Add IP Address"
   - Select "Allow Access from Anywhere" (0.0.0.0/0)
   - This is safe for your use case as you have authentication
7. Get Connection String:
   - Click "Database" (left sidebar)
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `myFirstDatabase` with `cricket-cup` or your preferred database name

Example connection string:
```
mongodb+srv://cricketuser:YourPassword123@cluster0.xxxxx.mongodb.net/cricket-cup?retryWrites=true&w=majority
```

## Verification

After setting the environment variable and redeploying:

1. Check the logs - you should see:
   ```
   Server running on port 8080
   MongoDB Connected: cluster0-shard-00-00.xxxxx.mongodb.net
   ```

2. Visit your deployment URL - you should see:
   ```json
   {"message": "Cricket Tournament Management API"}
   ```

3. Test the API:
   - `GET /api/teams` - Should return empty array `[]`
   - `GET /api/players` - Should return empty array `[]`
   - `GET /api/matches` - Should return empty array `[]`

## Current Error Explanation

The error you're seeing:
```
Error: The `uri` parameter to `openUri()` must be a string, got "undefined"
```

This means `process.env.MONGODB_URI` is undefined. You need to set this environment variable on your deployment platform before the app can connect to MongoDB.

## Need Help?

If you continue to have issues:
1. Check that the environment variable name is exactly `MONGODB_URI` (case-sensitive)
2. Check that there are no extra spaces in the connection string
3. Verify your MongoDB user has the correct password
4. Ensure your IP is whitelisted in MongoDB Atlas (use 0.0.0.0/0 for all IPs)
