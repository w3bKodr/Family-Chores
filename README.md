# Family Chores App

A complete, production-ready family chore tracking application built with React Native, Expo, TypeScript, and Supabase.

## Features

### 🔐 Authentication & Roles
- Email/password authentication
- Two roles: Parent and Child
- Parent creates family, child joins with family code
- Parent approval workflow for new members

### 👨‍👩‍👧 Parent Mode
- Create, edit, and delete chores
- Assign chores to children with recurring schedule (Mon-Sun)
- Weekly view of all chores and completion status
- Approve or reject child chore submissions
- Create rewards system with point requirements
- View each child's points and earned rewards
- Generate shareable family codes
- Manage family members and approve join requests

### 👧 Child Mode
- Simple, clean interface
- Today's chore view with checkboxes
- Mark chores as complete
- View current point balance
- Browse available and claimed rewards
- Claim rewards when they have enough points
- Cannot edit anything (read-only for children)

### ✨ Real-Time Features
- Instant sync when child completes a chore
- Real-time parent approval notifications
- Offline-first capabilities with automatic sync when online
- Push notifications (daily reminder setup included)

## Tech Stack

- **Frontend**: React Native + Expo SDK 51
- **Routing**: Expo Router with app directory
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Zustand
- **Styling**: NativeWind + Tailwind CSS
- **Notifications**: expo-notifications
- **Storage**: Secure storage with expo-secure-store

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Supabase account (https://supabase.com)
- iOS/macOS development environment (for iOS builds)

## Setup Instructions

### 1. Clone & Install Dependencies

```bash
cd /path/to/chores
npm install
```

### 2. Supabase Setup

1. Create a new project at https://supabase.com
2. In SQL Editor, run the entire contents of `lib/supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 3. Environment Variables

Create `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Also update in `app.json`:
- `extra.eas.projectId` with your EAS project ID (for push notifications)

### 4. Install SecureStore Package

```bash
npm install @react-native-async-storage/async-storage expo-secure-store
```

### 5. Run Development Server

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web (limited functionality)

## Project Structure

```
chores/
├── app/
│   ├── _layout.tsx                 # Root layout
│   └── (tabs)/
│       ├── _layout.tsx             # Tab navigation
│       ├── auth/
│       │   ├── _layout.tsx
│       │   ├── sign-in.tsx
│       │   ├── sign-up.tsx
│       │   ├── reset-password.tsx
│       │   └── index.tsx           # Profile page
│       ├── parent/
│       │   ├── _layout.tsx
│       │   ├── dashboard.tsx       # Parent home
│       │   ├── create-family.tsx
│       │   ├── create-chore.tsx
│       │   ├── child-detail.tsx
│       │   ├── weekly-view.tsx
│       │   └── rewards.tsx
│       ├── child/
│       │   ├── _layout.tsx
│       │   ├── today.tsx           # Child's daily chores
│       │   └── rewards.tsx         # Child's rewards
│       └── family/
│           └── index.tsx           # Family management
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase client setup
│   │   └── schema.sql             # Database schema & RLS
│   ├── store/
│   │   ├── authStore.ts           # Zustand auth store
│   │   └── familyStore.ts         # Zustand family/chore store
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   ├── utils/
│   │   └── dates.ts               # Date utilities
│   └── notifications/
│       └── setup.ts               # Push notifications setup
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── ChoreItem.tsx
│   └── RewardItem.tsx
├── app.json                        # Expo config
├── app.config.ts                   # Advanced config (optional)
├── tailwind.config.js              # Tailwind config
├── tsconfig.json
├── package.json
└── README.md
```

## Database Schema

### Tables
- `users` - Extended Supabase auth with role and family
- `families` - Family groups with parent and code
- `children` - Child members with point tracking
- `chores` - Chore definitions with emoji and repeat schedule
- `chore_completions` - Completion records with approval status
- `rewards` - Family rewards with point requirements
- `reward_claims` - Claimed rewards by children
- `join_requests` - Pending join requests from children

### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- Parents can manage family, chores, and rewards
- Children can view only their chores and rewards
- Only approved members can access family data
- Real-time updates are subscription-based

## Usage Guide

### For Parents

1. **Sign Up**: Choose "I'm a parent" role
2. **Create Family**: Name your family
3. **Add Chores**: 
   - Click "Create Chore"
   - Set title, description, points, emoji
   - Assign to child and select repeating days
4. **Invite Children**: 
   - Share family code through app
   - Approve their join requests
5. **Manage Rewards**: 
   - Create rewards with point requirements
   - View children's progress
6. **Approve Chores**: 
   - See pending submissions in weekly view
   - Approve to award points

### For Children

1. **Sign Up**: Choose "I'm a child"
2. **Join Family**: Enter parent's family code
3. **Complete Chores**:
   - View today's chores
   - Check off completed tasks
   - Wait for parent approval
4. **Earn Rewards**:
   - Accumulate points from approved chores
   - Claim rewards when you have enough points
   - Share achievements!

## Offline-First Sync

The app uses async-storage for local caching:
- Chores and completions are cached locally
- When offline, UI shows cached data
- Changes sync automatically when online
- Real-time subscriptions keep data fresh

To improve offline functionality further:
1. Add reaction-native-netinfo to detect connectivity
2. Queue local changes with react-query
3. Implement exponential backoff retry logic

## Push Notifications

Daily reminder is set up in `lib/notifications/setup.ts`:
- Scheduled for 8 AM daily
- Shows if child has uncompleted chores
- Can be customized per time zone

To enable:
1. Set up EAS project: `eas build:configure`
2. Update `app.json` with your projectId
3. Call `registerForPushNotificationsAsync()` on app start

## Styling

The app uses NativeWind with Tailwind CSS for responsive, beautiful UI:

**Color Scheme:**
- Primary: #FF6B6B (Coral red)
- Secondary: #4ECDC4 (Teal)
- Accent: #FFE66D (Golden)
- Success: #95E1D3 (Mint)
- Dark: #2D3436
- Light: #F5F6FA

Customize colors in `tailwind.config.js`

## Testing

### Test with Demo Credentials

Parent:
- Email: parent@example.com
- Password: password123

Child:
- Email: child@example.com
- Password: password123
- Family Code: (shown on parent dashboard)

### Test Workflows

1. **Create Chore**: Parent → Dashboard → Create Chore
2. **Complete Chore**: Child → Today → Mark Done
3. **Approve**: Parent → Weekly View → Approve
4. **Earn Reward**: Child → Rewards → Claim (when enough points)

## Building for iOS

### Development Build
```bash
eas build --platform ios --profile preview
```

### Production Build
```bash
eas build --platform ios --profile production
```

### Submit to App Store
```bash
eas submit --platform ios
```

## Troubleshooting

### Supabase Connection Issues
- Verify env variables are set correctly
- Check Supabase project is active
- Ensure RLS policies aren't blocking access

### Auth Issues
- Check email verification is enabled
- Ensure redirect URL matches in Supabase
- Try clearing app cache and re-signing in

### Real-Time Not Working
- Verify Realtime is enabled on tables
- Check user has RLS permissions
- Ensure subscription query is correct

### Push Notifications Not Working
- Verify EAS project ID is set
- Check notification permissions in app settings
- Test on physical device (not simulator)

## Performance Optimization

- Memoize components with React.memo
- Use react-query for caching queries
- Implement virtualization for long lists
- Compress images for rewards
- Use Code Splitting with Expo

## Security Considerations

- Never store passwords in state
- Use Supabase RLS for all data access
- Enable HTTPS only in production
- Rotate API keys regularly
- Implement rate limiting on Supabase

## Future Enhancements

- [ ] Photo uploads for rewards
- [ ] Chore history and statistics
- [ ] Custom themes per family
- [ ] Multi-language support
- [ ] Web dashboard for parents
- [ ] Family chat/messaging
- [ ] Integration with calendar apps
- [ ] Gamification (badges, streaks)
- [ ] Parent app notifications

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs
2. Review Expo Router guide: https://expo.dev/routing
3. Check React Native docs: https://reactnative.dev

## License

MIT License - feel free to use and modify!

## Contributing

Pull requests welcome! Please ensure:
- Code follows TypeScript best practices
- Tests pass
- README is updated if needed
- Commit messages are clear

---

Built with ❤️ for families everywhere. Happy choreography! 🎉
