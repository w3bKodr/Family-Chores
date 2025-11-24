import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkFamilyCodes() {
  const { data: families, error } = await supabase
    .from('families')
    .select('id, name, family_code, parent_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('All families in database:');
  families?.forEach(family => {
    console.log({
      name: family.name,
      family_code: family.family_code,
      family_code_type: typeof family.family_code,
      id: family.id
    });
  });
}

checkFamilyCodes();
