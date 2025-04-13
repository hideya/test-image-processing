# Deployment Instructions for Netlify Functions

The "Cannot use import statement outside a module" error indicates a mismatch between how Netlify is bundling your functions and the module system you're using.

## Solution Options:

### Option 1: Deploy Without Bundling

Add this to your netlify.toml:

```toml
[functions]
  node_bundler = "none"
```

This will prevent Netlify from bundling your functions and will deploy them as-is.

### Option 2: Use a Package.json in Each Function Directory

1. Create a package.json file in each function directory with:
   ```json
   {
     "type": "commonjs"
   }
   ```

2. Make sure all your functions use CommonJS syntax (require/module.exports).

### Option 3: Use Function-Specific Configuration

Create a `.js.json` file for each function with:

```json
{
  "type": "commonjs"
}
```

### Option 4: Direct Deploy via Netlify CLI

Deploy your functions without bundling using the Netlify CLI:

1. Install Netlify CLI if you haven't:
   ```
   npm install -g netlify-cli
   ```

2. Login:
   ```
   netlify login
   ```

3. Deploy with the `--functions` flag:
   ```
   netlify deploy --prod --functions netlify/functions
   ```

## Required Environment Variables

Make sure to set these in your Netlify dashboard:

```
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT
R2_BUCKET_NAME
JWT_SECRET
DATABASE_URL
```

## Final Check

Before deploying, ensure:

1. All functions use CommonJS syntax
2. Dependencies are correctly installed
3. No ESM syntax is being used in any of the function files
4. Node.js version is set to 18.x in netlify.toml
