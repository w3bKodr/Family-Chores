import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignUp() {
  const email = 'testparent2@example.com';
  const password = 'Password123!';
  const displayName = 'Test Parent 2';

  try {
    console.log('Attempting sign up...');
    
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role: 'parent' },
      },
    });

    if (signUpError) {
      console.error('❌ Sign up error:', signUpError);
      return;
    }

    console.log('✅ Auth user created:', authData.user?.id);

    if (!authData.user?.id) {
      console.error('❌ No user ID returned');
      return;
    }

    // Insert user record
    console.log('Creating user record...');
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        display_name: displayName,
        role: 'parent',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting user:', insertError);
      return;
    }

    console.log('✅ User record created:', userData);

    // Try to sign in
    console.log('\nTrying to sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('❌ Sign in error:', signInError.message);
      
      if (signInError.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email needs to be confirmed. Check Supabase dashboard:');
        console.log('   Authentication → Users → Find user → Confirm Email');
      }
      return;
    }

    console.log('✅ Sign in successful!');
    console.log('\nCredentials for testing:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSignUp();
