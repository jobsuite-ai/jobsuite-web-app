# AWS Amplify Multi-Environment Setup Guide

## Overview

AWS Amplify supports multiple environments through **branches**. Each branch can have its own:
- Environment variables
- Secret references
- Build settings
- Custom domains

## Environment Strategy

### Option 1: Branch-Based Environments (Recommended)

Map branches to environments:
- `main` → Production
- `staging` or `qa` → QA/Staging
- `dev` or `develop` → Development

### Option 2: Separate Amplify Apps

Create separate Amplify apps for each environment (more isolation, more setup).

## Setting Up Branch-Based Environments

### Step 1: Create Branches

```bash
# Create QA branch
git checkout -b qa
git push origin qa

# Create dev branch
git checkout -b dev
git push origin dev
```

### Step 2: Configure Branches in Amplify

1. **Go to Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify
   - Select your app: `jobsuite-web-app`

2. **Add Branches**
   - Click **Branches** in left sidebar
   - Click **Add branch**
   - Branch name: `qa` (or `staging`)
   - Framework: Next.js
   - Click **Save**

3. **Repeat for dev branch**

### Step 3: Configure Environment Variables Per Branch

1. **Go to App settings** → **Environment variables**
2. **Click Manage variables**

3. **Add Variables with Branch Override**

   For Production (`main` branch):
   - **Key**: `WEBHOOK_EMAIL`
   - **Value**: Reference secret → `jobsuite-webhook-service-account-prod` → Key: `email`
   - **Branches**: Select `main` only
   - Click **Save**

   For QA (`qa` branch):
   - **Key**: `WEBHOOK_EMAIL`
   - **Value**: Reference secret → `jobsuite-webhook-service-account-qa` → Key: `email`
   - **Branches**: Select `qa` only
   - Click **Save**

   For Dev (`dev` branch):
   - **Key**: `WEBHOOK_EMAIL`
   - **Value**: Reference secret → `jobsuite-webhook-service-account-dev` → Key: `email`
   - **Branches**: Select `dev` only
   - Click **Save**

4. **Repeat for `WEBHOOK_PASSWORD`**

### Step 4: Create Secrets for Each Environment

```bash
# Production secret
aws secretsmanager create-secret \
  --name jobsuite-webhook-service-account-prod \
  --secret-string '{"email":"webhook-prod@yourdomain.com","password":"prod-password"}' \
  --region us-east-1

# QA secret
aws secretsmanager create-secret \
  --name jobsuite-webhook-service-account-qa \
  --secret-string '{"email":"webhook-qa@yourdomain.com","password":"qa-password"}' \
  --region us-east-1

# Dev secret
aws secretsmanager create-secret \
  --name jobsuite-webhook-service-account-dev \
  --secret-string '{"email":"webhook-dev@yourdomain.com","password":"dev-password"}' \
  --region us-east-1
```

### Step 5: Configure IAM Permissions

Ensure Amplify service role can access all environment secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:jobsuite-webhook-service-account-prod-*",
        "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:jobsuite-webhook-service-account-qa-*",
        "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:jobsuite-webhook-service-account-dev-*"
      ]
    }
  ]
}
```

## Environment-Specific Configuration

### Using amplify.yml

You can customize build settings per branch:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        # Environment-specific setup
        - |
          if [ "$AWS_BRANCH" = "main" ]; then
            echo "Building for PRODUCTION"
          elif [ "$AWS_BRANCH" = "qa" ]; then
            echo "Building for QA"
          elif [ "$AWS_BRANCH" = "dev" ]; then
            echo "Building for DEV"
          fi
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

### Using Environment Variables in Code

Your code can detect the environment:

```typescript
// app/api/utils/serviceAuth.ts
const getApiBaseUrl = () => {
  // Check Amplify branch or NODE_ENV
  const branch = process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH;
  
  if (branch === 'main' || process.env.NODE_ENV === 'production') {
    return 'https://api.jobsuite.app';
  } else if (branch === 'qa' || branch === 'staging') {
    return 'https://qa.api.jobsuite.app';
  } else {
    return 'https://dev.api.jobsuite.app'; // or qa for dev
  }
};
```

## Branch Management

### Viewing Branch Deployments

1. In Amplify Console → **Branches**
2. See all branches and their deployment status
3. Click on a branch to see its deployments

### Branch Protection

For production (`main` branch):
1. Go to **Branches** → Select `main`
2. Click **Actions** → **Manage branch protection**
3. Enable:
   - Require approval for deployments
   - Require approval for deletions

### Custom Domains Per Branch

1. Go to **Domain management**
2. Add domain for each branch:
   - `app.jobsuite.app` → `main` branch
   - `qa.jobsuite.app` → `qa` branch
   - `dev.jobsuite.app` → `dev` branch

## Environment Variables Priority

When the same variable exists for multiple branches:
- Branch-specific value takes precedence
- If not set for branch, uses app-level default (if any)

## Testing Environment Setup

### Verify Environment Variables

Create a test endpoint:

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

Visit:
- Production: `https://your-app.amplifyapp.com/api/test-env`
- QA: `https://qa.your-app.amplifyapp.com/api/test-env`
- Dev: `https://dev.your-app.amplifyapp.com/api/test-env`

## Best Practices

1. ✅ **Use branch-based environments** for simplicity
2. ✅ **Separate secrets per environment** (prod/qa/dev)
3. ✅ **Use consistent naming**: `*-prod`, `*-qa`, `*-dev`
4. ✅ **Protect production branch** with approval requirements
5. ✅ **Use custom domains** for each environment
6. ✅ **Test deployments** on QA before production
7. ✅ **Monitor each environment** separately

## Workflow Example

```bash
# 1. Work on dev branch
git checkout dev
# Make changes
git commit -m "New feature"
git push origin dev
# Amplify auto-deploys to dev environment

# 2. Test on dev, then merge to QA
git checkout qa
git merge dev
git push origin qa
# Amplify auto-deploys to QA environment

# 3. After QA testing, merge to production
git checkout main
git merge qa
git push origin main
# Amplify auto-deploys to production (with approval if protected)
```

## Troubleshooting

### Variables Not Available in Branch

- **Check branch selection**: Ensure variable is set for the correct branch
- **Check secret exists**: Verify secret exists in Secrets Manager
- **Check IAM permissions**: Ensure Amplify role can access the secret
- **Redeploy**: Trigger a new deployment after adding variables

### Wrong Environment Detected

- **Check AWS_BRANCH**: Verify `process.env.AWS_BRANCH` matches expected branch
- **Check NODE_ENV**: Production builds set `NODE_ENV=production` regardless of branch
- **Use branch name**: Prefer `AWS_BRANCH` over `NODE_ENV` for environment detection

## Summary

1. **Create branches**: `main`, `qa`, `dev`
2. **Add branches in Amplify Console**
3. **Create separate secrets** for each environment
4. **Configure environment variables** per branch with secret references
5. **Set up IAM permissions** for all environment secrets
6. **Use `AWS_BRANCH`** environment variable to detect environment in code

