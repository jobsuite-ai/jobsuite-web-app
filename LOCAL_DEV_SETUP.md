# Local Development Setup

This guide explains how to configure the web app to connect to a locally running job engine.

## Quick Setup

The web app will automatically detect local development mode and connect to `http://localhost:8080` by default.

### Option 1: Automatic Detection (Recommended)

If you're running the web app in development mode (`npm run dev`), it will automatically connect to `http://localhost:8080` when:
- `NODE_ENV` is set to `development`
- No AWS/Amplify environment variables are set (`AWS_BRANCH`, `AMPLIFY_BRANCH`)

### Option 2: Explicit Configuration

You can explicitly set the job engine URL using environment variables:

#### Using `.env.local` file (Recommended)

Create a `.env.local` file in the `jobsuite-web-app` directory:

```bash
# Point to local job engine
NEXT_PUBLIC_JOB_ENGINE_API_URL=http://localhost:8080

# Or if your job engine runs on a different port:
# NEXT_PUBLIC_JOB_ENGINE_API_URL=http://localhost:8000
```

#### Using Environment Variables

```bash
# Set the job engine URL directly
export NEXT_PUBLIC_JOB_ENGINE_API_URL=http://localhost:8080

# Or use the alternative variable
export JOB_ENGINE_LOCAL_URL=http://localhost:8080
```

## Job Engine Port

The job engine runs on port **8080** by default (or whatever is set in the `PORT` environment variable).

To check what port your job engine is running on:
1. Check the job engine startup logs
2. Or check the `PORT` environment variable in your job engine configuration

## Verification

1. Start your job engine locally (should be running on `http://localhost:8080`)
2. Start your web app: `npm run dev`
3. Check the browser console or network tab to verify API calls are going to `http://localhost:8080`

## Troubleshooting

### Web app still connecting to remote API

- Make sure you're running in development mode: `NODE_ENV=development npm run dev`
- Check that `AWS_BRANCH` and `AMPLIFY_BRANCH` are not set (these override local detection)
- Verify your `.env.local` file is in the correct location (`jobsuite-web-app/.env.local`)
- Restart your Next.js dev server after changing environment variables

### CORS Errors

If you see CORS errors, make sure your job engine has CORS configured to allow requests from `http://localhost:3000` (or whatever port your Next.js app runs on).

### Connection Refused

- Verify the job engine is actually running: `curl http://localhost:8080/docs`
- Check the job engine port matches your configuration
- Ensure no firewall is blocking the connection

## Environment Variable Priority

The API base URL is determined in this order:

1. `NEXT_PUBLIC_JOB_ENGINE_API_URL` (explicit override - highest priority)
2. Local development detection (if `NODE_ENV=development` and no AWS env vars)
3. `JOB_ENGINE_LOCAL_URL` (if in local mode)
4. AWS branch-based routing (production/qa)

