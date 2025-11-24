# 🚀 Family Chores - Quick Start Guide (5 Minutes)

## Step 1: Install (1 minute)

```bash
cd chores
npm install
```

## Step 2: Get Supabase Credentials (2 minutes)

1. Go to https://supabase.com and create account
2. Click "New Project" 
3. Name: `family-chores`
4. Wait for setup (~2 min)
5. Go to **Settings > API**
6. Copy these two values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (long string)

## Step 3: Create .env.local (1 minute)

In project root, create `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key-here
```

Paste your values from Step 2.

## Step 4: Setup Database (1 minute)

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Open this file: `lib/supabase/schema.sql`
4. Copy ALL the SQL code
5. Paste into Supabase
6. Click **Run**
7. Wait for success ✅

## Step 5: Run App (30 seconds)

```bash
npm start
```

Press:
- `i` for iPhone simulator
- `a` for Android emulator
- `w` for web

## 🎉 Done!

You now have a complete family chore app running!

---

## Next: Test It Out

### Create Parent Account
1. Choose "I'm a parent"
2. Sign up with any email
3. Create family
4. Create a chore
5. Get family code from dashboard

### Create Child Account
1. Open second simulator/device
2. Sign up as child
3. Enter family code from parent
4. Click "Join"
5. Back on parent - approve the request

### Test Chore Flow
1. On child - see "Today's Chores"
2. Child clicks "Mark Done"
3. Parent sees pending approval
4. Parent clicks "Approve"
5. Check child's points increased! ✅

---

## 🎯 Key Screens

**Parent:**
- Dashboard - Overview
- Create Chore - New task
- Family - Manage members
- Rewards - Create prizes

**Child:**
- Today - Daily chores
- Rewards - Available/earned

---

## 📱 Download the Files

All files are in the `chores/` folder:
- ✅ 19 app screens
- ✅ 5 reusable components
- ✅ 2 Zustand stores
- ✅ Database schema with RLS
- ✅ Complete documentation

---

## 🐛 Troubleshooting

**"Missing Supabase credentials"**
- ✅ Check `.env.local` exists
- ✅ Check values are pasted correctly
- ✅ Restart Expo: press `r`

**"Cannot connect to database"**
- ✅ Verify Supabase project is active
- ✅ Check URL doesn't have trailing `/`
- ✅ Verify anon key is correct

**"Sign up fails"**
- ✅ Check database schema ran (see Step 4)
- ✅ Check email isn't already used
- ✅ Check password is 6+ chars

---

## 📚 Next Steps

1. Customize colors in `tailwind.config.js`
2. Add your family members
3. Create real chores
4. Test all features
5. Set up EAS Build for iOS
6. Submit to App Store!

See **README.md** for detailed setup & **SETUP.md** for complete guide.

---

**You're all set! 🎉**

Questions? Check the docs folder or see the code - it's fully commented!
