# SUPABASE FUNCTION DEPLOYMENT FIX

## Problem
The StudentPortalPage is failing with a JSON parsing error because the `student-portal` Supabase Edge Function is not deployed or not working properly.

## Solution Steps

### 1. Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link to your project
```bash
supabase link --project-ref lfsmtsnakdaukxgrqynk
```

### 4. Deploy all functions
```bash
supabase functions deploy
```

### 5. Deploy specific function (if needed)
```bash
supabase functions deploy student-portal
```

## Verification

After deployment, you can test the function:
```bash
curl "https://lfsmtsnakdaukxgrqynk.supabase.co/functions/v1/student-portal?token=test"
```

You should get a JSON response, not HTML.

## Alternative Quick Fix

If you can't deploy the functions right now, you can create a mock data response in the StudentPortalPage component for testing purposes.

## Troubleshooting

1. **Docker Issues**: Make sure Docker is running if using local development
2. **Authentication**: Ensure you're logged into the correct Supabase account
3. **Project Access**: Verify you have permissions to deploy functions to this project
4. **Function Errors**: Check Supabase dashboard for function logs and errors

## Files Fixed
- `src/pages/StudentPortalPage.tsx` - Enhanced error handling and logging