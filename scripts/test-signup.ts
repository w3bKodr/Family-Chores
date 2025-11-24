import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `autotest_${Date.now()}@example.com`;
  const password = 'Password1!';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: 'Auto Test', role: 'parent' },
    },
  });

  console.log('signUp error', error);
  console.log('signUp data', data);

  if (data.user?.id) {
    const userId = data.user.id;
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        role: 'parent',
        display_name: 'Auto Test',
      });

    console.log('users insert error', insertError);

    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('users fetch error', fetchError);
    console.log('users fetch data', userRow);

    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({
        name: 'Auto Test Family',
        parent_id: userId,
      })
      .select()
      .single();

    console.log('families insert error', familyError);
    console.log('families insert data', familyData);
  }
}

run();
