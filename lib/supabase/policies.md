| policy_ddl                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 
## Database policies (generated)

This file contains the SQL DDL for Row-Level Security policies exported from the database. Each policy is provided as a DROP + CREATE block so it can be applied to another database.

The content is organized by table. Review before applying to staging/production.

---

### public.children

```sql
DROP POLICY IF EXISTS "Family members can read children" ON public.children;
CREATE POLICY "Family members can read children" ON public.children
   FOR SELECT TO authenticated,dashboard_user
   USING ((family_id = current_user_family_id()));

DROP POLICY IF EXISTS "Parents can delete children" ON public.children;
CREATE POLICY "Parents can delete children" ON public.children
   FOR DELETE TO authenticated
   USING (
      (family_id = current_user_family_id())
      OR family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Parents can insert children" ON public.children;
CREATE POLICY "Parents can insert children" ON public.children
   FOR INSERT TO authenticated
   USING (true)
   WITH CHECK (
      (family_id = current_user_family_id())
      OR family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Parents can update children" ON public.children;
CREATE POLICY "Parents can update children" ON public.children
   FOR UPDATE TO authenticated
   USING (
      (family_id = current_user_family_id())
      OR family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Temp restore children select" ON public.children;
CREATE POLICY "Temp restore children select" ON public.children
   FOR SELECT TO authenticated
   USING ((family_id = current_user_family_id()));
```

---

### public.chore_completions

```sql
DROP POLICY IF EXISTS "Children can insert completions" ON public.chore_completions;
CREATE POLICY "Children can insert completions" ON public.chore_completions
   FOR INSERT TO public
   USING (true)
   WITH CHECK (
      (completed_by IN (
         SELECT children.id FROM children where (children.user_id = auth.uid())
      ))
   );

DROP POLICY IF EXISTS "Family members can read completions" ON public.chore_completions;
CREATE POLICY "Family members can read completions" ON public.chore_completions
   FOR SELECT TO public
   USING (
      EXISTS (
         SELECT 1 FROM (chores c JOIN users u ON (u.id = auth.uid()))
         WHERE ((c.id = chore_completions.chore_id) AND (c.family_id = u.family_id))
      )
   );

DROP POLICY IF EXISTS "Parents can delete completions" ON public.chore_completions;
CREATE POLICY "Parents can delete completions" ON public.chore_completions
   FOR DELETE TO public
   USING (
      chore_id IN (
         SELECT chores.id FROM chores WHERE (chores.family_id IN (
            SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
         ))
      )
   );

DROP POLICY IF EXISTS "Parents can update completions" ON public.chore_completions;
CREATE POLICY "Parents can update completions" ON public.chore_completions
   FOR UPDATE TO public
   USING (
      chore_id IN (
         SELECT chores.id FROM chores WHERE (chores.family_id = (
            SELECT chores.family_id FROM families WHERE (families.parent_id = auth.uid())
         ))
      )
   );
```

---

### public.chores

```sql
DROP POLICY IF EXISTS "Family members can read chores" ON public.chores;
CREATE POLICY "Family members can read chores" ON public.chores
   FOR SELECT TO public
   USING (
      EXISTS (
         SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.family_id = chores.family_id))
      )
   );

DROP POLICY IF EXISTS "Parents can delete chores" ON public.chores;
CREATE POLICY "Parents can delete chores" ON public.chores
   FOR DELETE TO public
   USING (
      family_id = (
         SELECT chores.family_id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Parents can insert chores" ON public.chores;
CREATE POLICY "Parents can insert chores" ON public.chores
   FOR INSERT TO public
   USING (true)
   WITH CHECK (
      family_id = (
         SELECT chores.family_id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Parents can update chores" ON public.chores;
CREATE POLICY "Parents can update chores" ON public.chores
   FOR UPDATE TO public
   USING (
      family_id = (
         SELECT chores.family_id FROM families WHERE (families.parent_id = auth.uid())
      )
   );
```

---

### public.families

```sql
DROP POLICY IF EXISTS "Anyone can read families by family_code for joining" ON public.families;
CREATE POLICY "Anyone can read families by family_code for joining" ON public.families
   FOR SELECT TO anon
   USING ((family_code IS NOT NULL));

DROP POLICY IF EXISTS "Dashboard user read families (consolidated)" ON public.families;
CREATE POLICY "Dashboard user read families (consolidated)" ON public.families
   FOR SELECT TO dashboard_user
   USING (
      (parent_id = auth.uid())
      OR (id = current_user_family_id())
      OR ((family_code IS NOT NULL) AND (family_code = (auth.jwt() ->> 'join_code'::text)))
   );

DROP POLICY IF EXISTS "Parents and family members can read own family" ON public.families;
CREATE POLICY "Parents and family members can read own family" ON public.families
   FOR SELECT TO authenticated
   USING (
      (parent_id = auth.uid()) OR (id = current_user_family_id())
   );

DROP POLICY IF EXISTS "Parents can insert family" ON public.families;
CREATE POLICY "Parents can insert family" ON public.families
   FOR INSERT TO authenticated
   USING (true)
   WITH CHECK ((parent_id = auth.uid()));

DROP POLICY IF EXISTS "Parents can update own family" ON public.families;
CREATE POLICY "Parents can update own family" ON public.families
   FOR UPDATE TO authenticated
   USING ((parent_id = auth.uid()));
```

---

### public.join_requests

```sql
DROP POLICY IF EXISTS "Parents can update join requests" ON public.join_requests;
CREATE POLICY "Parents can update join requests" ON public.join_requests
   FOR UPDATE TO public
   USING (
      family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Users can insert join requests" ON public.join_requests;
CREATE POLICY "Users can insert join requests" ON public.join_requests
   FOR INSERT TO public
   USING (true)
   WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read own join requests" ON public.join_requests;
CREATE POLICY "Users can read own join requests" ON public.join_requests
   FOR SELECT TO public
   USING (
      (user_id = auth.uid())
      OR (family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      ))
   );
```

---

### public.parent_join_requests

```sql
DROP POLICY IF EXISTS "Family owners can delete parent join requests" ON public.parent_join_requests;
CREATE POLICY "Family owners can delete parent join requests" ON public.parent_join_requests
   FOR DELETE TO public
   USING (
      family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Family owners can update parent join requests" ON public.parent_join_requests;
CREATE POLICY "Family owners can update parent join requests" ON public.parent_join_requests
   FOR UPDATE TO public
   USING (
      family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Users can insert own parent join requests" ON public.parent_join_requests;
CREATE POLICY "Users can insert own parent join requests" ON public.parent_join_requests
   FOR INSERT TO public
   USING (true)
   WITH CHECK ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can read own parent join requests" ON public.parent_join_requests;
CREATE POLICY "Users can read own parent join requests" ON public.parent_join_requests
   FOR SELECT TO public
   USING (
      (user_id = auth.uid())
      OR (family_id IN (
         SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
      ))
   );
```

---

### public.reward_claims

```sql
DROP POLICY IF EXISTS "Children can claim rewards" ON public.reward_claims;
CREATE POLICY "Children can claim rewards" ON public.reward_claims
   FOR INSERT TO public
   USING (true)
   WITH CHECK (
      child_id IN (
         SELECT children.id FROM children WHERE (children.user_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Family members can read claims" ON public.reward_claims;
CREATE POLICY "Family members can read claims" ON public.reward_claims
   FOR SELECT TO public
   USING (
      EXISTS (
         SELECT 1 FROM (children c JOIN users u ON (u.id = auth.uid()))
         WHERE ((c.id = reward_claims.child_id) AND (c.family_id = u.family_id))
      )
   );

DROP POLICY IF EXISTS "Parents can update claims" ON public.reward_claims;
CREATE POLICY "Parents can update claims" ON public.reward_claims
   FOR UPDATE TO public
   USING (
      (child_id IN (
         SELECT children.id FROM children WHERE (children.family_id IN (
            SELECT families.id FROM families WHERE (families.parent_id = auth.uid())
         ))
      ))
      OR (child_id IN (
         SELECT children.id FROM children WHERE (children.family_id IN (
            SELECT users.family_id FROM users WHERE (users.id = auth.uid())
         ))
      ))
   );
```

---

### public.rewards

```sql
DROP POLICY IF EXISTS "Family members can read rewards" ON public.rewards;
CREATE POLICY "Family members can read rewards" ON public.rewards
   FOR SELECT TO public
   USING (
      EXISTS (SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.family_id = rewards.family_id)))
   );

DROP POLICY IF EXISTS "Parents can delete rewards" ON public.rewards;
CREATE POLICY "Parents can delete rewards" ON public.rewards
   FOR DELETE TO public
   USING (
      family_id = (
         SELECT rewards.family_id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Parents can insert rewards" ON public.rewards;
CREATE POLICY "Parents can insert rewards" ON public.rewards
   FOR INSERT TO public
   USING (true)
   WITH CHECK (
      family_id = (
         SELECT rewards.family_id FROM families WHERE (families.parent_id = auth.uid())
      )
   );

DROP POLICY IF EXISTS "Parents can update rewards" ON public.rewards;
CREATE POLICY "Parents can update rewards" ON public.rewards
   FOR UPDATE TO public
   USING (
      family_id = (
         SELECT rewards.family_id FROM families WHERE (families.parent_id = auth.uid())
      )
   );
```

---

### public.users

```sql
DROP POLICY IF EXISTS "Dashboard user read" ON public.users;
CREATE POLICY "Dashboard user read" ON public.users
   FOR SELECT TO authenticated
   USING (((auth.uid() = id) OR (family_id = current_user_family_id())));

DROP POLICY IF EXISTS "Dashboard user update consolidated" ON public.users;
CREATE POLICY "Dashboard user update consolidated" ON public.users
   FOR UPDATE TO authenticated
   USING (
      (auth.uid() = id)
      OR (family_id IS NULL)
      OR (family_id IN (SELECT families.id FROM families WHERE (families.parent_id = auth.uid())))
   )
   WITH CHECK (
      (auth.uid() = id)
      OR (family_id IS NULL)
      OR (family_id IN (SELECT families.id FROM families WHERE (families.parent_id = auth.uid())))
   );

DROP POLICY IF EXISTS "Temp restore users select" ON public.users;
CREATE POLICY "Temp restore users select" ON public.users
   FOR SELECT TO authenticated
   USING (((auth.uid() = id) OR (family_id = current_user_family_id())));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
   FOR INSERT TO authenticated
   USING (true)
   WITH CHECK ((auth.uid() = id));
```

---

If you want this organized differently (one file per table, or separate migrations), tell me and I will split it into files under `scripts/`.
