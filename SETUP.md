# Family Chores - Setup Guide

## Quick Start (5 minutes)

### 1. Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free at https://supabase.com)
- Xcode (for iOS) or Android Studio (for Android)

### 2. Install & Configure

```bash
# Navigate to project
cd chores

# Install dependencies
npm install

# Create .env.local file in root
cat > .env.local << EOF
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF
```

### 3. Supabase Setup (Required)

1. Go to https://supabase.com and create a new project
2. In the Supabase dashboard:
   - Go to **SQL Editor**
   - Click **New Query**
   - Copy the entire contents of `lib/supabase/schema.sql`
   - Paste and run the query
3. Go to **Settings > API**
   - Copy your **Project URL** → paste to `EXPO_PUBLIC_SUPABASE_URL`
   - Copy your **anon public** key → paste to `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4. Run Development Server

```bash
npm start
```

Then press:
- **i** for iOS simulator
- **a** for Android emulator
- **w** for web

## Detailed Setup Steps

### Setting up Supabase Database

#### Step 1: Create Supabase Project
1. Visit https://supabase.com
2. Click "New Project"
3. Name it "family-chores"
4. Set a strong password
5. Select your region (closest to your location)
6. Wait for project to initialize (~2 minutes)

#### Step 2: Run Database Schema
1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query** (top right)
3. Open `lib/supabase/schema.sql` in your editor
4. Copy all SQL code
5. Paste into Supabase query editor
6. Click **Run** (Cmd+Enter or Ctrl+Enter)
7. Verify: Should see "CREATE TABLE" success messages

#### Step 3: Enable Row Level Security

All tables should have RLS enabled automatically from the schema. Verify:
1. Go to **Authentication > Policies**
2. Each table should show policies for select, insert, update, delete

#### Step 4: Get API Credentials
1. Go to **Settings** (gear icon, bottom left)
2. Click **API**
3. Copy the values:
   - **Project URL** (Project URL section)
   - **anon public** key (API KEYS section)
   - Paste these into `.env.local`

### Setting up Expo Project

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Create Environment File
Create `.env.local` in project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Step 3: Test Connection
```bash
npm start
```

In the Expo app, look for any errors in the terminal. If you see Supabase connection errors, double-check your credentials.

## Project Configuration

### Update app.json (Optional)

If you want push notifications to work:

1. Create EAS project: `eas init`
2. In `app.json`, update `extra.eas.projectId` with your project ID
3. For submission to App Store, update:
   - `bundleIdentifier`
   - `appleTeamId` (from Apple Developer account)

### Customize Colors

In `tailwind.config.js`, modify the colors object to match your brand:

```javascript
colors: {
  primary: '#FF6B6B',      // Change this
  secondary: '#4ECDC4',    // And this
  // ... etc
}
```

## Running the App

### Development
```bash
npm start
```
Press `i` for iOS, `a` for Android.

### Development Build (for testing notifications)
```bash
eas build --platform ios --profile preview
```

### Production Build
```bash
eas build --platform ios --profile production
```

## Testing the App

### Demo Accounts

After setup, you can create test accounts:

**Parent Account:**
- Email: parent@example.com
- Password: password123
- Role: I'm a parent

**Child Account:**
- Email: child@example.com  
- Password: password123
- Role: I'm a child
- Use family code from parent dashboard

### Test Workflows

1. **Workflow: Create and Complete Chore**
   - Sign in as parent
   - Create family
   - Create a chore
   - Sign in as child (in different app instance or device)
   - Complete the chore
   - Parent approves
   - Check points increased

2. **Workflow: Earn Reward**
   - Continue from above with accumulated points
   - Parent creates reward (50 points)
   - Child claims reward if points ≥ 50
   - Points deducted, reward claimed

3. **Workflow: Multiple Children**
   - Parent creates family
   - Generate family code
   - Have multiple children sign up with code
   - Assign different chores to each
   - Verify each sees only their chores

## Troubleshooting

### Supabase Connection Errors

**Error: "Missing Supabase credentials"**
- Check `.env.local` exists
- Verify exact values from Supabase Settings > API
- Restart Expo dev server after changing env vars

**Error: "CORS error" or "Network request failed"**
- Verify Supabase project is active (Settings > General)
- Check Supabase URL doesn't have trailing slash
- Ensure your network allows outbound HTTPS to Supabase

### Authentication Issues

**Error: "Invalid login credentials"**
- Make sure email is registered
- Check password is correct
- Verify email confirmation is not required (Settings > Auth > Email Auth)

**Error: "User creation failed"**
- Check email isn't already registered
- Ensure password is at least 6 characters
- Verify Supabase auth is enabled

### Database/RLS Issues

**Error: "User does not have access"**
- Likely RLS policy issue
- Go to SQL Editor and verify policies exist
- Re-run the schema.sql if policies are missing

**Error: "Relation does not exist"**
- Tables weren't created
- Re-run schema.sql in Supabase SQL Editor
- Clear browser cache of Supabase dashboard

### UI/Performance Issues

**App is slow or unresponsive**
- Check network connection
- Reduce query size (fewer records)
- Memoize components with React.memo

**Styling looks wrong**
- Make sure NativeWind is installed: `npm list nativewind`
- Restart Expo dev server
- Clear cache: `npm start -- --clear`

## Important Files to Know

- **App entry**: `app/_layout.tsx` - Root layout & session check
- **Auth logic**: `lib/store/authStore.ts` - Zustand auth store
- **Family/chore logic**: `lib/store/familyStore.ts` - Main app state
- **Supabase setup**: `lib/supabase/client.ts` - Client configuration
- **Database**: `lib/supabase/schema.sql` - All tables & policies
- **Push notifications**: `lib/notifications/setup.ts` - Notification config

## Common Customizations

### Change App Name
In `app.json`:
```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

### Change Primary Colors
In `tailwind.config.js`:
```javascript
colors: {
  primary: '#YOUR_COLOR',
}
```

### Add a New Chore
In parent dashboard → Create Chore button

### Invite Children
In parent Family tab → Share Family Code

## Next Steps

1. ✅ Complete setup steps above
2. ✅ Create test accounts
3. ✅ Test all workflows
4. ✅ Customize branding (colors, name)
5. ✅ Add real family members
6. ✅ Set up push notifications (optional)
7. ✅ Build for iOS: `eas build --platform ios`
8. ✅ Submit to App Store: `eas submit --platform ios`

## Support & Documentation

- **Expo**: https://docs.expo.dev
- **Expo Router**: https://expo.dev/routing
- **Supabase**: https://supabase.com/docs
- **React Native**: https://reactnative.dev/docs

## Getting Help

If you encounter issues:
1. Check the Troubleshooting section above
2. Check official docs linked above
3. Look at error messages in terminal carefully
4. Try clearing cache: `npm start -- --clear`
5. Restart your development server

## Production Deployment

See `README.md` for detailed build and submission instructions.

---

**Congratulations!** You now have a complete, production-ready family chore tracking app! 🎉
