# Family Chores - Complete File Structure

## Overview
This is a complete production-ready React Native + Expo + TypeScript + Supabase family chore tracking app.

## Directory Structure

```
chores/
├── app/                          # Expo Router app directory
│   ├── _layout.tsx              # Root layout with auth check
│   └── (tabs)/                  # Tabbed navigation
│       ├── _layout.tsx          # Tab router
│       ├── auth/                # Authentication screens
│       │   ├── _layout.tsx
│       │   ├── sign-in.tsx      # Email/password login
│       │   ├── sign-up.tsx      # Register (role selection)
│       │   ├── reset-password.tsx
│       │   └── index.tsx        # Profile screen
│       ├── parent/              # Parent-only screens
│       │   ├── _layout.tsx
│       │   ├── index.tsx        # Redirect to dashboard
│       │   ├── dashboard.tsx    # Home (family overview)
│       │   ├── create-family.tsx
│       │   ├── create-chore.tsx
│       │   ├── child-detail.tsx
│       │   ├── weekly-view.tsx  # All chores by day
│       │   └── rewards.tsx      # Manage rewards
│       ├── child/               # Child-only screens
│       │   ├── _layout.tsx
│       │   ├── index.tsx        # Redirect to today
│       │   ├── today.tsx        # Daily chores (main screen)
│       │   └── rewards.tsx      # Available/claimed rewards
│       └── family/              # Family management
│           ├── _layout.tsx
│           ├── index.tsx        # Redirect to manage
│           └── manage.tsx       # Family code & join requests
│
├── lib/                         # Core application logic
│   ├── supabase/
│   │   ├── client.ts           # Supabase client setup
│   │   └── schema.sql          # Complete database schema + RLS
│   ├── store/
│   │   ├── authStore.ts        # Zustand: auth state (sign in/up/out)
│   │   └── familyStore.ts      # Zustand: chores, rewards, children, etc
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces for all entities
│   ├── utils/
│   │   ├── dates.ts            # Date/day utilities
│   │   └── offline.ts          # Offline cache & sync queue
│   └── notifications/
│       └── setup.ts            # Push notification configuration
│
├── components/                  # Reusable UI components
│   ├── Button.tsx              # Custom button with variants
│   ├── Input.tsx               # Text input component
│   ├── Card.tsx                # Container card
│   ├── ChoreItem.tsx           # Chore list item display
│   └── RewardItem.tsx          # Reward list item with progress
│
├── assets/                      # (Create these)
│   ├── icon.png               # App icon
│   ├── splash.png             # Splash screen
│   └── notification-icon.png  # Notification icon
│
├── Configuration Files
│   ├── app.json               # Expo configuration
│   ├── app.config.ts          # Advanced config (optional)
│   ├── tsconfig.json          # TypeScript config
│   ├── tailwind.config.js     # Tailwind CSS theme
│   ├── package.json           # Dependencies & scripts
│   ├── .npmrc                 # npm configuration
│   ├── .prettierrc            # Code formatting
│   ├── .gitignore             # Git ignore
│   ├── .env.example           # Environment template
│   ├── eas.json               # EAS Build config
│   ├── index.ts               # Expo Router entry
│   ├── README.md              # Main documentation
│   ├── SETUP.md               # Setup instructions
│   └── FILE_STRUCTURE.md      # This file
```

## Key Files Explained

### Authentication Flow
- `lib/store/authStore.ts` - Manages login, registration, session state
- `app/(tabs)/auth/sign-in.tsx` - Login screen
- `app/(tabs)/auth/sign-up.tsx` - Registration with role selection
- `app/_layout.tsx` - Redirects to login if no session

### Parent Features
- `lib/store/familyStore.ts` - All parent operations (chores, children, rewards)
- `app/(tabs)/parent/dashboard.tsx` - View families and children
- `app/(tabs)/parent/create-chore.tsx` - Add new chores
- `app/(tabs)/parent/weekly-view.tsx` - See all chores by day
- `app/(tabs)/parent/rewards.tsx` - Create and manage rewards
- `app/(tabs)/family/manage.tsx` - Invite children, approve join requests

### Child Features
- `app/(tabs)/child/today.tsx` - Main daily chores view
- `app/(tabs)/child/rewards.tsx` - Browse and claim rewards
- All chores, rewards are read-only from child perspective

### Database & Backend
- `lib/supabase/schema.sql` - Defines all 8 tables with RLS policies
- `lib/supabase/client.ts` - Configures Supabase with secure auth
- `lib/types/index.ts` - TypeScript definitions for all entities

### Offline & Performance
- `lib/utils/offline.ts` - Local caching and sync queue
- `lib/notifications/setup.ts` - Daily reminder notifications

## Technology Stack

- **Framework**: React Native 0.74 + Expo 51
- **Routing**: Expo Router (file-based)
- **Language**: TypeScript 5.3
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State**: Zustand 4.4
- **Styling**: NativeWind 2.0 + Tailwind 3.4
- **Storage**: AsyncStorage + Secure Store
- **Notifications**: expo-notifications
- **Security**: Row Level Security (RLS) policies

## Database Schema Overview

### Users Table
- Extended Supabase auth with role (parent/child)
- Linked to family_id

### Families Table
- Created by parent
- Has unique family_code for children to join
- Parent can regenerate code

### Children Table
- Child members of family
- Tracks points earned
- Status: pending/approved/rejected

### Chores Table
- Created by parent
- Assigned to specific child
- Repeats on selected days (Mon-Sun)
- Has points value and emoji

### Chore Completions Table
- Record of when child completes chore
- Status: pending (waiting parent approval), approved, rejected
- When approved, points are awarded to child

### Rewards Table
- Created by parent
- Points required to claim
- Optional image URL

### Reward Claims Table
- When child claims reward
- Deducts points from child
- Records achievement

### Join Requests Table
- When child requests to join family with code
- Parent must approve/reject
- Sets up the relationship

## Authentication & Authorization

All data access uses Supabase Row Level Security (RLS) policies:

- **Parents** can only see their own family data
- **Children** can only see their family's data after approval
- **Unapproved children** cannot access any family data
- **Fields are protected** - email changes restricted, etc.

## Deployment

### Development
```bash
npm start
```

### Testing
```bash
eas build --platform ios --profile preview
```

### Production
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

See README.md for complete build instructions.

## Code Organization Principles

1. **Screens** - App screens in `app/` directory with Expo Router
2. **Components** - Reusable UI components in `components/`
3. **State Management** - Zustand stores in `lib/store/`
4. **Types** - All TypeScript interfaces in `lib/types/`
5. **Backend** - Supabase client in `lib/supabase/`
6. **Utilities** - Helper functions in `lib/utils/`

## Future Enhancement Ideas

- Photo uploads for rewards
- Chore history analytics
- Family themes/customization
- Push notification system (ready to enable)
- Web dashboard for parents
- Family chat/messaging
- Calendar integration
- Gamification (badges, streaks)
- Dark mode support

## Performance Considerations

- Zustand for lightweight state management
- Async/await for all network calls
- Local caching to reduce server requests
- Offline queue for failed mutations
- Memoized components prevent re-renders
- FlatList for long lists (not used yet, can add)

---

**Created**: Complete production-ready app ✅
**Status**: Ready to deploy
**Last Updated**: 2024
