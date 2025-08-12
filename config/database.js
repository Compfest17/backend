const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables for database connection');
}

const supabaseDb = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testConnection = async () => {
  try {
    const { data, error } = await supabaseDb
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .limit(0);
    
    if (error) {
      const { data: simpleData, error: simpleError } = await supabaseDb.auth.getSession();
      if (simpleError && simpleError.message !== 'No session available') {
        throw new Error(`Database connection failed: ${simpleError.message}`);
      }
    }
    
    console.log('Database PostgreSQL (Supabase) connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

module.exports = {
  supabaseDb,
  testConnection
};
