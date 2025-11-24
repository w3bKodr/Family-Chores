const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function createTestUser() {
  const email = 'test@example.com';
  const password = 'Password123!';
  
  console.log('Creating test user:', email);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: 'Test User', role: 'parent' }
    }
  });
  
  if (error) {
    console.error('Signup error:', error);
    return;
  }
  
  console.log('User created:', data.user?.id);
  
  if (data.user) {
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      role: 'parent',
      display_name: 'Test User'
    });
    
    if (insertError) {
      console.error('Profile insert error:', insertError);
    } else {
      console.log('Profile created successfully');
    }
  }
}

createTestUser().then(() => process.exit(0));
