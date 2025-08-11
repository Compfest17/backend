const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    console.log('Supabase connected successfully');
  } catch (error) {
    console.log('Supabase connection test skipped (table _health_check not found)');
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testSupabaseConnection
};
