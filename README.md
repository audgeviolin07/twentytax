# TaxHelper

TaxHelper is a comprehensive tax assistance application with three main features:
1. IRS Requirements Checker - Find out what tax forms you need to file based on your state
2. Email Document Scanner - Scan your email for tax documents like W2s and 1099s
3. Expense Classifier - Upload bank statements to classify expenses for tax filing

## Setup Instructions

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/taxhelper.git
cd taxhelper
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory of the project with the following variables:

\`\`\`
# OpenAI API Key for AI-powered features
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret_here
\`\`\`

You can get an OpenAI API key by signing up at [https://platform.openai.com/signup](https://platform.openai.com/signup).

For Supabase, create a project at [https://supabase.com](https://supabase.com) and get your API keys from the project settings.

### 4. Set Up Supabase Database

Run the following SQL in your Supabase SQL editor to create the necessary tables:

\`\`\`sql
-- Create users_profile table to store additional user information
CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create emails table to store user emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  preview TEXT,
  read BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  has_tax_document BOOLEAN DEFAULT FALSE,
  document_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tax_documents table to store extracted tax document information
CREATE TABLE IF NOT EXISTS tax_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  issuer TEXT NOT NULL,
  tax_year TEXT NOT NULL,
  financial_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for security

-- Users profile policies
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON users_profile FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON users_profile FOR UPDATE
USING (auth.uid() = id);

-- Emails policies
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own emails"
ON emails FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emails"
ON emails FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emails"
ON emails FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emails"
ON emails FOR DELETE
USING (auth.uid() = user_id);

-- Tax documents policies
ALTER TABLE tax_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tax documents"
ON tax_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tax documents"
ON tax_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax documents"
ON tax_documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax documents"
ON tax_documents FOR DELETE
USING (auth.uid() = user_id);
\`\`\`

### 5. Run the Development Server

\`\`\`bash
npm run dev
\`\`\`

The application will be available at [http://localhost:3000](http://localhost:3000).

## Features

### IRS Requirements Checker
- Select your state to see what tax forms you need to file
- View state-specific tax rates and requirements
- See excerpts from official IRS and state tax authority documentation

### Email Document Scanner
- Scan your email for tax documents
- Upload tax documents directly
- Extract key information from tax forms

### Expense Classifier
- Upload bank statements in CSV, Excel, or PDF format
- Automatically classify expenses into tax categories
- Identify tax-deductible expenses
- View expense summaries and breakdowns

## Technologies Used

- Next.js
- React
- OpenAI API
- Supabase (Authentication & Database)
- TailwindCSS
- shadcn/ui components

## License

MIT
