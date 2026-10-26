// The only settings the front end needs. Both values are safe to publish:
// the anon key only allows what the database's row-level security rules allow.
// While supabaseUrl is empty, every page runs on built-in sample data (preview mode).
export const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  contactEmail: 'TheFibroidFixer@gmail.com',
};

export const SAMPLE_MODE = !CONFIG.supabaseUrl;
