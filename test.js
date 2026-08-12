import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
    'https://lvdmivhialuhdlljxzkz.supabase.co',
    'sb_secret_yHBV_KJ8AKssG75q6AXJSQ_P1syGA5M'
);
const { data, error } = await supabase.from('users').select('*');
console.log('Connected!', data);
