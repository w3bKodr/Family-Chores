# API Reference - Zustand Stores

## Auth Store (`lib/store/authStore.ts`)

Manages user authentication and session state.

### State Properties

```typescript
user: User | null              // Current logged-in user
session: any                   // Supabase session object
loading: boolean              // Whether async operation is in progress
error: string | null          // Last error message
```

### Methods

#### `signUp(email, password, displayName, role)`
Register a new user.

```typescript
const { signUp } = useAuthStore();
await signUp('user@example.com', 'password123', 'John', 'parent');
```

**Parameters:**
- `email: string` - User email
- `password: string` - Password (min 6 chars)
- `displayName: string` - User's display name
- `role: 'parent' | 'child'` - User role

**Returns:** Promise (throws on error)

---

#### `signIn(email, password)`
Login with email/password.

```typescript
const { signIn } = useAuthStore();
await signIn('user@example.com', 'password123');
```

**Parameters:**
- `email: string` - User email
- `password: string` - Password

**Returns:** Promise (throws on error)

---

#### `signOut()`
Logout current user.

```typescript
const { signOut } = useAuthStore();
await signOut();
```

**Returns:** Promise (throws on error)

---

#### `resetPassword(email)`
Send password reset email.

```typescript
const { resetPassword } = useAuthStore();
await resetPassword('user@example.com');
```

**Parameters:**
- `email: string` - User email

**Returns:** Promise (throws on error)

---

#### `checkSession()`
Check if user has active session on app start.

```typescript
const { checkSession } = useAuthStore();
await checkSession();
```

**Called automatically in** `app/_layout.tsx`

**Returns:** Promise

---

#### `setUser(user)`
Set user object (usually not called directly).

```typescript
const { setUser } = useAuthStore();
setUser(userData);
```

---

#### `setSession(session)`
Set session object (usually not called directly).

---

## Family Store (`lib/store/familyStore.ts`)

Manages families, chores, children, rewards, and all family operations.

### State Properties

```typescript
family: Family | null
children: Child[]
chores: Chore[]
choreCompletions: ChoreCompletion[]
rewards: Reward[]
rewardClaims: RewardClaim[]
joinRequests: JoinRequest[]
loading: boolean
error: string | null
```

### Family Methods

#### `createFamily(name, userId)`
Create new family (parent only).

```typescript
const { createFamily } = useFamilyStore();
const family = await createFamily('The Smiths', userId);
```

---

#### `getFamily(familyId)`
Fetch family details.

```typescript
const { getFamily } = useFamilyStore();
await getFamily('uuid-here');
```

---

#### `generateFamilyCode()`
Generate new family code to share with children.

```typescript
const { generateFamilyCode } = useFamilyStore();
const code = await generateFamilyCode(); // e.g., "ABC123"
```

### Children Methods

#### `getChildren(familyId)`
Fetch all approved children in family.

```typescript
const { getChildren } = useFamilyStore();
await getChildren(familyId);
// Populates: state.children
```

---

#### `addChild(familyId, userId, displayName)`
Add child to family (use with join requests).

```typescript
const { addChild } = useFamilyStore();
await addChild(familyId, userId, 'Emma');
```

---

#### `approveChild(childId)`
Approve child's join request.

```typescript
const { approveChild } = useFamilyStore();
await approveChild(childId);
```

---

#### `rejectChild(childId)`
Reject child's join request.

```typescript
const { rejectChild } = useFamilyStore();
await rejectChild(childId);
```

### Chore Methods

#### `getChores(familyId)`
Fetch all chores for family.

```typescript
const { getChores } = useFamilyStore();
await getChores(familyId);
// Populates: state.chores
```

---

#### `createChore(chore)`
Create new chore.

```typescript
const { createChore } = useFamilyStore();
await createChore({
  family_id: familyId,
  assigned_to: childId,        // Child UUID
  title: 'Clean bedroom',
  description: 'Tidy up and vacuum',
  points: 25,
  emoji: '🧹',
  repeating_days: ['Monday', 'Wednesday', 'Friday']
});
```

**Parameters:**
- `family_id: string` - Family UUID
- `assigned_to: string` - Child UUID
- `title: string` - Chore title
- `description: string | null` - Optional description
- `points: number` - Points awarded when completed
- `emoji: string` - Display emoji
- `repeating_days: string[]` - Which days (e.g., ["Monday"])

---

#### `updateChore(choreId, updates)`
Update existing chore.

```typescript
const { updateChore } = useFamilyStore();
await updateChore(choreId, {
  title: 'New title',
  points: 30
});
```

---

#### `deleteChore(choreId)`
Delete chore permanently.

```typescript
const { deleteChore } = useFamilyStore();
await deleteChore(choreId);
```

### Chore Completion Methods

#### `getChoreCompletions(familyId)`
Fetch completion records.

```typescript
const { getChoreCompletions } = useFamilyStore();
await getChoreCompletions(familyId);
// Populates: state.choreCompletions
```

---

#### `completeChore(choreId, childId, date)`
Child marks chore as complete (pending parent approval).

```typescript
const { completeChore } = useFamilyStore();
const today = new Date().toISOString().split('T')[0]; // "2024-01-15"
await completeChore(choreId, childId, today);
```

**Parameters:**
- `choreId: string` - Chore UUID
- `childId: string` - Child UUID
- `date: string` - Date in "YYYY-MM-DD" format

---

#### `approveCompletion(completionId, userId)`
Parent approves chore completion and awards points.

```typescript
const { approveCompletion } = useFamilyStore();
await approveCompletion(completionId, parentUserId);
// Automatically adds points to child
```

---

#### `rejectCompletion(completionId)`
Parent rejects incomplete/incorrect chore.

```typescript
const { rejectCompletion } = useFamilyStore();
await rejectCompletion(completionId);
```

### Reward Methods

#### `getRewards(familyId)`
Fetch all rewards.

```typescript
const { getRewards } = useFamilyStore();
await getRewards(familyId);
// Populates: state.rewards
```

---

#### `createReward(reward)`
Create new reward.

```typescript
const { createReward } = useFamilyStore();
await createReward({
  family_id: familyId,
  title: 'Extra gaming time',
  points_required: 50,
  image_url: null  // Optional: "https://..."
});
```

---

#### `deleteReward(rewardId)`
Delete reward.

```typescript
const { deleteReward } = useFamilyStore();
await deleteReward(rewardId);
```

### Reward Claim Methods

#### `claimReward(rewardId, childId)`
Child claims a reward (if they have enough points).

```typescript
const { claimReward } = useFamilyStore();
await claimReward(rewardId, childId);
// Deducts points automatically
// Shows confetti/success
```

---

#### `getRewardClaims(familyId)`
Fetch all claimed rewards in family.

```typescript
const { getRewardClaims } = useFamilyStore();
await getRewardClaims(familyId);
// Populates: state.rewardClaims
```

### Join Request Methods

#### `getJoinRequests(familyId)`
Fetch pending join requests (parent only).

```typescript
const { getJoinRequests } = useFamilyStore();
await getJoinRequests(familyId);
// Populates: state.joinRequests
```

---

#### `createJoinRequest(familyId, userId)`
Child requests to join family with code.

```typescript
const { createJoinRequest } = useFamilyStore();
await createJoinRequest(familyId, childUserId);
// Sets status to 'pending'
```

---

#### `approveJoinRequest(requestId, userId)`
Parent approves child's join request.

```typescript
const { approveJoinRequest } = useFamilyStore();
await approveJoinRequest(requestId, parentUserId);
// Adds child to family
// Updates user's family_id
```

---

#### `rejectJoinRequest(requestId)`
Parent rejects child's join request.

```typescript
const { rejectJoinRequest } = useFamilyStore();
await rejectJoinRequest(requestId);
```

### Utility Methods

#### `setFamily(family)`
Set family object directly (usually not needed).

```typescript
const { setFamily } = useFamilyStore();
setFamily(familyData);
```

---

#### `setError(error)`
Set error message directly.

```typescript
const { setError } = useFamilyStore();
setError(null); // Clear error
```

## Usage Examples

### Example 1: Parent Creating a Chore

```typescript
import { useAuthStore } from '@lib/store/authStore';
import { useFamilyStore } from '@lib/store/familyStore';

function CreateChoreScreen() {
  const { family, children, createChore, loading } = useFamilyStore();
  const [title, setTitle] = useState('');

  const handleCreate = async () => {
    if (!family) return;
    
    await createChore({
      family_id: family.id,
      assigned_to: children[0].id,
      title,
      description: null,
      points: 10,
      emoji: '✓',
      repeating_days: ['Monday', 'Tuesday'],
    });
    
    setTitle('');
  };

  return (
    <Button 
      onPress={handleCreate} 
      disabled={loading}
      title={loading ? 'Creating...' : 'Create Chore'}
    />
  );
}
```

### Example 2: Child Completing a Chore

```typescript
function TodayScreen() {
  const { user } = useAuthStore();
  const { children, chores, completeChore } = useFamilyStore();
  
  const child = children.find(c => c.user_id === user?.id);
  const todayChores = chores.filter(c => c.assigned_to === child?.id);

  const handleComplete = async (choreId: string) => {
    const today = new Date().toISOString().split('T')[0];
    await completeChore(choreId, child!.id, today);
    Alert.alert('Done!', 'Waiting for parent approval');
  };

  return (
    <FlatList
      data={todayChores}
      renderItem={({ item }) => (
        <Button onPress={() => handleComplete(item.id)} title="Mark Done" />
      )}
    />
  );
}
```

### Example 3: Parent Approving Chores

```typescript
function WeeklyViewScreen() {
  const { user } = useAuthStore();
  const { choreCompletions, approveCompletion } = useFamilyStore();
  
  const pendingApprovals = choreCompletions.filter(cc => cc.status === 'pending');

  const handleApprove = async (completionId: string) => {
    await approveCompletion(completionId, user!.id);
    Alert.alert('Approved!', 'Points awarded');
  };

  return (
    <List>
      {pendingApprovals.map(completion => (
        <Button 
          key={completion.id}
          onPress={() => handleApprove(completion.id)}
          title="Approve"
        />
      ))}
    </List>
  );
}
```

---

For more examples, see the screen files in `app/(tabs)/parent/` and `app/(tabs)/child/`.
