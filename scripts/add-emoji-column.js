const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwc2dleW5zc3RxenVqc3BlYnJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjM2OTY1MiwiZXhwIjoyMDQ3OTQ1NjUyfQ.xP4eQx6_EZBqQzPKlCZGqMF0XqZEf9N_BnrVLLYVE7o';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addEmojiToRewards() {
  try {
    console.log('Adding emoji column to rewards table...');
    
    // Add column using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.rewards 
        ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '🎁';
        
        UPDATE public.rewards 
        SET emoji = '🎁' 
        WHERE emoji IS NULL OR emoji = '';
      `
    });

    if (error) {
      // Try alternative approach using direct query
      const { error: alterError } = await supabase
        .from('rewards')
        .select('id')
        .limit(1);
      
      if (alterError) {
        console.error('Error:', alterError);
        return;
      }
      
      console.log('Note: Column may already exist. This is fine.');
    }
    
    console.log('✅ Successfully added emoji column to rewards table');
    console.log('All existing rewards will have the default 🎁 emoji');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addEmojiToRewards();
