import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signInAndCreateUser() {
  const email = 'kalsh1987@gmail.com';
  const password = 'test!';
  const displayName = 'Shawn';

  try {
    // Sign in as the user
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return;
    }

    console.log('✅ Signed in successfully as:', authData.user.id);

    // Check if user record exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (existingUser) {
      console.log('✅ User record already exists:', existingUser);
      return;
    }

    console.log('User record missing, creating...');

    // Insert the user record while authenticated
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        display_name: displayName,
        role: 'parent',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting user:', insertError);
      return;
    }

    console.log('✅ User record created successfully:', newUser);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

signInAndCreateUser();
