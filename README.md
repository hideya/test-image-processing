# Image Processing Test WebApp
A test web application for image analysis and angle measurements

## Features

- **User Authentication**: Secure JWT-based authentication system
- **Image Upload & Processing**: Automatic angle detection in uploaded images
- **Data Visualization**: Interactive charts displaying angle measurements over time
- **Responsive Design**: Optimized for desktop and mobile devices
- **Image Management**: View, rotate, and analyze uploaded images
- **Custom Date Selection**: Associate measurements with specific dates
- **User Settings**: Customize timezone and date format preferences
- **Memo & Icons**: Add memo text and icons to measurements for better categorization

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Recharts, React Query
- **Backend**: Node.js, Express
- **Image Processing**: OpenCV, Sharp
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (JSON Web Token) authentication
- **UI Framework**: ShadCN UI components
- **Deployment**: Optimized for Netlify serverless functions with stateless architecture

## Prerequisites

Before setting up the application, ensure you have the following installed:

- Node.js (v18 or later)
- npm (v8 or later)
- PostgreSQL (v14 or later)

## Installation

### Setting Up the Application

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure environment variables in a `.env` file:
   - `DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database_name>`
   - `JWT_SECRET=<your_secret_key>`
4. Set up the database with `npm run db:push`

### Running the Application

To start the application in development mode:
```bash
npm run dev
```

The application will be available at http://localhost:5000

For production deployment:
```bash
npm run build
npm start
```

### Deploying to Netlify

The application is configured to run on Netlify using serverless functions:

1. Configure Netlify environment variables with the same values as your .env file
2. Deploy to Netlify:
```bash
netlify deploy --prod
```

## API Security

The application uses JWT (JSON Web Token) authentication. For details on implementation and usage see:
- [JWT Migration Documentation](JWT_MIGRATION.md)
- [JWT Usage Guide](JWT_USAGE.md)