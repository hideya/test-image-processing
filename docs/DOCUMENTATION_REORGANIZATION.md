# Documentation Reorganization Plan

Follow these steps to organize the project documentation into a dedicated docs directory:

## Step 1: Create the docs directory

```bash
mkdir -p docs
```

## Step 2: Move documentation files

```bash
# Move documentation files to the docs directory
mv JWT_MIGRATION.md docs/
mv JWT_USAGE.md docs/
mv NETLIFY_IMPLEMENTATION.md docs/
mv NETLIFY_PRODUCTION_NOTES.md docs/
mv OPENCV_PRIORITY.md docs/
mv SPECIFICATIONS.md docs/
# Don't move README.md - keep it in the root directory
```

## Step 3: Update README.md with references to the docs directory

Edit README.md to update the links to documentation files:

```diff
- [JWT Migration Documentation](JWT_MIGRATION.md)
- [JWT Usage Guide](JWT_USAGE.md)
+ [JWT Migration Documentation](docs/JWT_MIGRATION.md)
+ [JWT Usage Guide](docs/JWT_USAGE.md)
```

## Step 4: Add Documentation section to README.md

Add a new section to README.md that guides readers to the documentation:

```markdown
## Documentation

Detailed documentation can be found in the `docs/` directory:

- [API Specifications](docs/SPECIFICATIONS.md): Database schema, API endpoints, and workflows
- [JWT Authentication](docs/JWT_USAGE.md): Guide for using JWT authentication
- [JWT Migration](docs/JWT_MIGRATION.md): Migration from session-based to JWT auth
- [Netlify Implementation](docs/NETLIFY_IMPLEMENTATION.md): Serverless architecture implementation
- [Netlify Deployment](docs/NETLIFY_PRODUCTION_NOTES.md): Production deployment notes
- [Netlify Troubleshooting](docs/NETLIFY_TROUBLESHOOTING.md): Solutions for common deployment issues
- [OpenCV Priority](docs/OPENCV_PRIORITY.md): Notes on OpenCV implementation
```

## Step 5: Move the DOCUMENTATION_REORGANIZATION.md file (this file)

Once you've completed the reorganization:

```bash
mv DOCUMENTATION_REORGANIZATION.md docs/
```

## Benefits of this reorganization:

1. **Cleaner project root directory**: Only essential files remain in the root
2. **Improved organization**: Documentation is centralized in one place
3. **Better discoverability**: New team members can easily find all documentation
4. **Follows standard practices**: Many open-source projects use a docs directory

## Optional further organization:

If the documentation grows, consider creating subdirectories by topic:

```
docs/
├── architecture/
│   └── SPECIFICATIONS.md
├── deployment/
│   ├── NETLIFY_IMPLEMENTATION.md
│   ├── NETLIFY_PRODUCTION_NOTES.md
│   └── NETLIFY_TROUBLESHOOTING.md
└── security/
    ├── JWT_MIGRATION.md
    └── JWT_USAGE.md
```
