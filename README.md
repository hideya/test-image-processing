# Image Processing Test WebApp
A test web application for image analysis

## Features

- **User Authentication**: Secure login and registration system
- **Image Upload & Processing**: Automatic angle detection in uploaded images
- **Data Visualization**: Interactive charts displaying angle measurements over time
- **Responsive Design**: Optimized for desktop and mobile devices
- **Image Management**: View, rotate, and analyze uploaded images
- **Custom Date Selection**: Associate measurements with specific dates
- **User Settings**: Customize timezone and date format preferences


## Technology Stack

- **Frontend**: React, Tailwind CSS, Recharts, React Query
- **Backend**: Node.js, Express
- **Image Processing**: OpenCV, Sharp
- **Database**: PostgreSQL
- **Authentication**: Passport.js with session-based auth
- **UI Framework**: ShadCN UI components

## Prerequisites

Before setting up the application, ensure you have the following installed:

- Node.js (v18 or later)
- npm (v8 or later)
- PostgreSQL (v14 or later)
- OpenCV for image processing

## Installation

### Setting Up the Application

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure environment variables in a `.env` file:
   - DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database_name>
   - SESSION_SECRET=<your_secret_key>
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

