import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erzuccfcabkocmopxftk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyenVjY2ZjYWJrb2Ntb3B4ZnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxOTU0MTEsImV4cCI6MjA4MTc3MTQxMX0.EKeIEWucLPjNPqYw68uoZM21REAh1LiiyAP3D9p1xBk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
    console.log('Attempting to create user: jesus.limon@laimu.mx');
    const { data, error } = await supabase.auth.signUp({
        email: 'jesus.limon@laimu.mx',
        password: 'Laimu123581321'
    });

    if (error) {
        console.error('Error creating user:', error.message);
    } else {
        console.log('User created successfully:', data.user);
        if (!data.session) {
            console.log('User created/found. If new, confirmation email sent (if enabled).');
        }
    }
}

createUser();
