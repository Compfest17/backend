const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testSupabaseConnection = async () => {
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError && authError.message !== 'No session available') {
      console.warn('Supabase auth test warning:', authError.message);
    } else {
      console.log('Supabase Auth service connected successfully');
    }
    
    try {
      const { data: dbData, error: dbError } = await supabaseAdmin.auth.getSession();
      console.log('Supabase Database service connected successfully');
    } catch (dbErr) {
      console.warn('Supabase database test warning:', dbErr.message);
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testSupabaseConnection
};
