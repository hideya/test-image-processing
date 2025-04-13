# Deployment Instructions

Follow these steps carefully to deploy the application to Netlify:

## 1. Install Dependencies

First, install all dependencies for both the standalone functions and the main application:

```bash
# Install main app dependencies
npm install

# Install function-specific dependencies
cd netlify/functions
chmod +x install-deps.sh
./install-deps.sh
cd ../..
```

## 2. Deploy with Netlify CLI

```bash
# Login to Netlify (if not already logged in)
netlify login

# Link to your Netlify site
netlify link

# Deploy to production
netlify deploy --prod
```

## 3. Verify Environment Variables

Make sure your Netlify site has these environment variables set:

- `R2_ACCESS_KEY_ID`: Your Cloudflare R2 access key
- `R2_SECRET_ACCESS_KEY`: Your Cloudflare R2 secret key
- `R2_ENDPOINT`: https://3fe42e55e5d4ec266d544a471a483b5a.r2.cloudflarestorage.com
- `R2_BUCKET_NAME`: test-image-processing
- `JWT_SECRET`: Your JWT secret for authentication
- `DATABASE_URL`: Your PostgreSQL database connection string

You can set these variables in the Netlify UI (Site settings > Environment variables) or using the CLI:

```bash
netlify env:set KEY "VALUE"
```

## 4. Troubleshooting

If you encounter any issues:

1. Check Netlify function logs in the Netlify dashboard
2. Ensure all environment variables are correctly set
3. Verify that dependencies were installed correctly
4. Check that the database is accessible from Netlify

## 5. Note on Function Structure

This deployment uses standalone functions for critical endpoints like login and user info.
Other endpoints will be automatically bundled by Netlify's build process.
