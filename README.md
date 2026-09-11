# Multigate Medical Supplies

A modern e-commerce platform for medical supplies and equipment.

## Quick Start

1. **Install dependencies**: 
   ```bash
   npm install
   ```

2. **Set up environment variables**: 
   Create a `.env.local` file with your configuration:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET_KEY=your_jwt_secret_key
   ADMIN_EMAIL=your_admin_email@example.com
   ADMIN_PASSWORD_HASH=your_bcrypt_hash
   ```
   To generate `ADMIN_PASSWORD_HASH`, run: `node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1],10).then(h=>console.log(h))" "YourPassword"`

3. **Start development server**: 
   ```bash
   npm run dev
   ```

4. **Build for production**: 
   ```bash
   npm run build
   npm start
   ```

## Project Structure

- `src/app/` - Next.js App Router pages and routes
- `src/components/` - React components
- `src/lib/` - Utility functions and helpers
- `src/contexts/` - React context providers
- `src/hooks/` - Custom React hooks

## Admin dashboard

- **URL**: `/admin` (login at `/admin/login`)
- **Tabs**: Orders (first), Products, Categories, Reports
- **Products**: Add/edit products with high-quality image URL; categories required first.
- **Orders**: List of all orders with details.
- **Reports**: Total orders, revenue, items sold, and sales by product.
- Without Supabase, data is stored in memory (resets on restart). Configure Supabase and run the schema for persistent storage.

## Features

- Next.js 16 with TypeScript
- Tailwind CSS for styling
- Supabase integration ready
- Payment processing setup
- Admin dashboard (Orders, Products, Categories, Reports)
- Responsive design

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

## Notes

Customize for your medical supplies business needs.
