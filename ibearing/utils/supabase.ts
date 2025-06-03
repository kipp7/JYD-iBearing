// utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl ='https://qpvomuhcrkwhgqbwgztx.supabase.co';  // 添加引号
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdm9tdWhjcmt3aGdxYndnenR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxNzQwODMsImV4cCI6MjA2MTc1MDA4M30._BCW3Qyf4BDoq5LohzljWpc43trDx9qTsuk8tgMdBuo';  // 添加引号

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
