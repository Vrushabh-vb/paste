# Copy-Paste Online

A simple application to share text content with 4-digit codes. Pastes expire after 30 minutes.

## Features

- Create pastes with a simple text input
- Access pastes with a 4-digit code
- Automatic expiration after 30 minutes

## Deployment Instructions

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```

### Deploying to Vercel

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Set up Vercel KV for persistent storage:
   - Go to the Storage tab in your Vercel dashboard
   - Click "Create" and select "KV Database"
   - Follow the setup instructions
   - After creating the database, Vercel will provide environment variables
   - Add these environment variables to your Vercel project:
     - KV_URL
     - KV_REST_API_URL
     - KV_REST_API_TOKEN
     - KV_REST_API_READ_ONLY_TOKEN
4. Deploy your project

## Environment Variables

The following environment variables are required for production:

- `KV_URL`: Vercel KV connection URL
- `KV_REST_API_URL`: Vercel KV REST API URL
- `KV_REST_API_TOKEN`: Vercel KV REST API token
- `KV_REST_API_READ_ONLY_TOKEN`: Vercel KV read-only token

## How It Works

- In development: Uses in-memory storage
- In production: Uses Vercel KV for persistent storage

## Technologies Used

- Next.js 15
- React 19
- Vercel KV (for production)
- Tailwind CSS
- Shadcn UI components 