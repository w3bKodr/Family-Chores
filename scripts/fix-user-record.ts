import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserRecord() {
  const email = 'kalsh1987@gmail.com';
  
  try {
    // Get the auth user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const authUser = users?.find(u => u.email === email);
    
    if (!authUser) {
      console.error('Auth user not found');
      return;
    }

    console.log('Found auth user:', authUser.id);

    // Check if user record exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (existingUser) {
      console.log('User record already exists:', existingUser);
      return;
    }

    console.log('User record missing, creating...');

    // Insert the missing user record
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        display_name: 'Shawn',
        role: 'parent',
        created_at: authUser.created_at,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return;
    }

    console.log('✅ User record created successfully:', newUser);
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserRecord();
