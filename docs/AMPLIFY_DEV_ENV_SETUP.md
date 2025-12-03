# Setting Up Development Environment Variables in Amplify

## Quick Answer

To use development environment variables in Amplify:

1. **Set branch-specific environment variables** in Amplify Console
2. **Use `AWS_BRANCH` environment variable** to detect the branch
3. **Optionally set `NODE_ENV` in amplify.yml** based on branch

## Step-by-Step Setup

### Step 1: Configure Branch-Specific Environment Variables

1. **Go to Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify
   - Select your app: `jobsuite-web-app`

2. **Add Environment Variables for Dev Branch**
   - Go to **App settings** → **Environment variables**
   - Click **Manage variables**
   - Click **Add variable**

3. **For Development Branch (`dev`):**
   - **Key**: `WEBHOOK_EMAIL`
   - **Value**: Reference secret → Select `jobsuite-webhook-service-account-dev` → Key: `email`
   - **Branches**: Select `dev` (or your dev branch name) only
   - Click **Save**

   - **Key**: `WEBHOOK_PASSWORD`
   - **Value**: Reference secret → Select `jobsuite-webhook-service-account-dev` → Key: `password`
   - **Branches**: Select `dev` only
   - Click **Save**

4. **Repeat for QA Branch (`qa`):**
   - Same process, but select `qa` branch and use `jobsuite-webhook-service-account-qa` secret

5. **Repeat for Production (`main`):**
   - Same process, but select `main` branch and use `jobsuite-webhook-service-account-prod` secret

### Step 2: Verify Branch Detection

The `amplify.yml` file now includes branch detection. When you push to different branches:

- **`main` branch**: Uses production environment variables
- **`qa` branch**: Uses QA environment variables  
- **`dev` branch**: Uses development environment variables

### Step 3: Test the Setup

1. **Push to dev branch:**
   ```bash
   git checkout dev
   git push origin dev
   ```

2. **Check Amplify build logs:**
   - Go to Amplify Console → Your app → **Build history**
   - Click on the latest build
   - Look for the preBuild phase output:
     ```
     Building for DEVELOPMENT (dev branch)
     Branch: dev
     NODE_ENV: development
     WEBHOOK_EMAIL configured: yes
     ```

3. **Verify at runtime:**
   Create a test endpoint to check which environment is active:

   ```typescript
   // app/api/test-env/route.ts
   export async function GET() {
     return Response.json({
       branch: process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH || 'local',
       nodeEnv: process.env.NODE_ENV,
       hasWebhookEmail: !!process.env.WEBHOOK_EMAIL,
       hasWebhookPassword: !!process.env.WEBHOOK_PASSWORD,
       apiUrl: process.env.NODE_ENV === 'production' 
         ? 'https://api.jobsuite.app' 
         : 'https://qa.api.jobsuite.app',
     });
   }
   ```

   Visit: `https://dev.your-app.amplifyapp.com/api/test-env`

## How It Works

### Environment Variable Priority

1. **Branch-specific variables** (highest priority)
   - Variables set for the specific branch in Amplify Console
   
2. **App-level variables**
   - Variables set for all branches (if no branch-specific override)

3. **`.env` files** (lowest priority)
   - `.env.production` (if NODE_ENV=production)
   - `.env.development` (if NODE_ENV=development)
   - `.env.local` (always loaded, but typically not committed)

### Branch Detection

Amplify automatically sets these environment variables during build:

- `AWS_BRANCH` - The branch name (e.g., "main", "qa", "dev")
- `AMPLIFY_BRANCH` - Same as AWS_BRANCH (alternative name)
- `NODE_ENV` - Always "production" by default (we override in amplify.yml)

### Code Detection

Your code can detect the environment using:

```typescript
const branch = process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH;
const nodeEnv = process.env.NODE_ENV;

if (branch === 'main') {
  // Production
} else if (branch === 'qa') {
  // QA
} else if (branch === 'dev') {
  // Development
}
```

## Troubleshooting

### Variables Not Available in Dev Branch

**Problem**: Environment variables not showing up for dev branch builds.

**Solutions**:
1. **Check branch selection**: In Amplify Console → Environment variables, ensure the variable is set for the `dev` branch specifically
2. **Verify branch name**: Make sure the branch name matches exactly (case-sensitive)
3. **Redeploy**: After adding variables, trigger a new deployment:
   - Go to Amplify Console → Your app → **Branches**
   - Click on `dev` branch
   - Click **Redeploy this version**

### NODE_ENV Still Shows Production

**Problem**: Even with the amplify.yml changes, NODE_ENV is still "production".

**Note**: This is expected! Next.js builds always use `NODE_ENV=production` for optimization. The important part is:
- ✅ Branch-specific environment variables are available
- ✅ You can use `AWS_BRANCH` to detect the environment
- ✅ The `NODE_ENV` override in amplify.yml is mainly for logging/debugging

**Solution**: Use `AWS_BRANCH` instead of `NODE_ENV` for environment detection:

```typescript
// ✅ Good - uses branch
const branch = process.env.AWS_BRANCH;
if (branch === 'dev') { /* dev logic */ }

// ❌ Less reliable - NODE_ENV is always production in builds
if (process.env.NODE_ENV === 'development') { /* won't work */ }
```

### Secret Not Found

**Problem**: Build fails with "secret not found" error.

**Solutions**:
1. **Verify secret exists**: 
   ```bash
   aws secretsmanager describe-secret --secret-id jobsuite-webhook-service-account-dev
   ```

2. **Check IAM permissions**: Ensure Amplify service role can access the secret

3. **Check secret format**: Must be JSON with `email` and `password` fields:
   ```json
   {
     "email": "webhook-dev@domain.com",
     "password": "dev-password"
   }
   ```

## Best Practices

1. ✅ **Use branch-specific variables** for all environment-specific configs
2. ✅ **Use `AWS_BRANCH`** instead of `NODE_ENV` for environment detection
3. ✅ **Separate secrets** for each environment (prod/qa/dev)
4. ✅ **Test on dev** before merging to QA
5. ✅ **Test on QA** before merging to production
6. ✅ **Monitor build logs** to verify correct environment variables are used

## Summary

To use development environment variables:

1. ✅ **Set variables in Amplify Console** with branch selection = `dev`
2. ✅ **Reference dev-specific secrets** from Secrets Manager
3. ✅ **Use `AWS_BRANCH` in code** to detect environment
4. ✅ **Push to dev branch** → Amplify automatically uses dev variables

The `amplify.yml` changes help with debugging and logging, but the key is setting branch-specific environment variables in the Amplify Console.

