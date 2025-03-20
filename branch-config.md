# Branch-Specific Environment Configuration

This document outlines how to set up branch-specific environment variables for your Cloud Build triggers.

## Overview

The Dockerfile and cloudbuild.yaml have been updated to support different environment configurations based on the branch being built. This is achieved through Cloud Build's substitution variables.

## Cloud Build Configuration

### Logging Configuration

When using a custom service account with Cloud Build, you must specify a logging configuration. Our cloudbuild.yaml includes:

```yaml
options:
  dynamicSubstitutions: true
  logging: CLOUD_LOGGING_ONLY
```

Alternative logging options:
1. Specify a logs bucket: `logsBucket: 'gs://my-project-logs-bucket'`
2. Use regional user-owned bucket: `defaultLogsBucketBehavior: REGIONAL_USER_OWNED_BUCKET`

## Setting Up Branch-Specific Triggers

1. Go to the Google Cloud Console
2. Navigate to Cloud Build > Triggers
3. Create a new trigger (or edit an existing one) for each branch/environment

### Main Branch (Production)

The default values in cloudbuild.yaml are set for production:

```yaml
substitutions:
  _REGION: europe-west1
  _BACKEND_URL: https://propertyblurb-backend-816018499473.europe-west1.run.app
  _POSTHOG_KEY: phc_zNCDCefGUF5ECu5w8Htyj2qPT7eXczCKj0Chrx02AEt
  _POSTHOG_URL: https://eu.i.posthog.com
  _NODE_ENV: production
```

You don't need to specify these values in the trigger settings unless you want to override them.

### Development Branch

Create a trigger that:
1. Triggers on push to the `development` branch
2. Uses the following substitution variables:

```
_BACKEND_URL: https://dev-propertyblurb-backend.run.app
_NODE_ENV: development
_POSTHOG_KEY: [development-key-here]
_POSTHOG_URL: https://eu.i.posthog.com
```

### Staging Branch

Create a trigger that:
1. Triggers on push to the `staging` branch
2. Uses the following substitution variables:

```
_BACKEND_URL: https://staging-propertyblurb-backend.run.app
_NODE_ENV: production
_POSTHOG_KEY: [staging-key-here]
_POSTHOG_URL: https://eu.i.posthog.com
```

## Testing Your Configuration

You can test that the correct environment variables are being used by:

1. Adding a temporary log statement in your Next.js application to output environment variables
2. Pushing to different branches and checking the logs in the deployed application

## Troubleshooting

If environment variables aren't being set correctly:

1. Check the Cloud Build logs to ensure the `--build-arg` parameters are being passed correctly
2. Verify that the Dockerfile is using the ARG values to set ENV variables
3. Make sure your Next.js application is correctly accessing the environment variables

If you encounter the following error:
```
Failed to trigger build: if 'build.service_account' is specified, the build must either (a) specify 'build.logs_bucket', (b) use the REGIONAL_USER_OWNED_BUCKET build.options.default_logs_bucket_behavior option, or (c) use either CLOUD_LOGGING_ONLY / NONE logging options: invalid argument
```

Make sure your cloudbuild.yaml has a proper logging configuration as mentioned in the "Logging Configuration" section above. 