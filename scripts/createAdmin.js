/**
 * scripts/createAdmin.js
 * ----------------------
 * Utility script to generate a bcrypt password hash and create the college
 * PLACEMENT OFFICER (Admin) account.
 * 
 * Viva explanation:
 * - In this College Placement Portal, the Admin is the College Placement Officer.
 * - The Placement Officer is responsible for approving visiting companies (recruiters),
 *   verifying student academic profiles, monitoring student placements, and viewing metrics.
 * 
 * Usage:
 *   node scripts/createAdmin.js
 *   node scripts/createAdmin.js "Dr. Placement Officer" "placement@college.edu" "SecurePass@123"
 */

const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const run = async () => {
  const args = process.argv.slice(2);
  const name = args[0] || 'College Placement Officer';
  const email = args[1] || 'admin@portal.com';
  const password = args[2] || 'Admin@123';

  console.log('====================================================');
  console.log('  COLLEGE PLACEMENT PORTAL - PLACEMENT OFFICER SEED');
  console.log('====================================================');
  console.log(`👤 Name:     ${name}`);
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${password}`);

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  console.log('\n🔒 Generated Bcrypt Hash:');
  console.log(hashedPassword);

  console.log('\n📋 Direct SQL Query (copy-paste into Supabase SQL Editor):');
  console.log(`
INSERT INTO users (name, email, password, role, is_approved)
VALUES ('${name.replace(/'/g, "''")}', '${email.replace(/'/g, "''")}', '${hashedPassword}', 'admin', true)
ON CONFLICT (email) 
DO UPDATE SET password = EXCLUDED.password, name = EXCLUDED.name, is_approved = true, role = 'admin';
  `);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    supabaseUrl &&
    serviceKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !serviceKey.includes('your-supabase-service-role-key')
  ) {
    try {
      console.log('🚀 Attempting to insert/update Placement Officer in Supabase...');
      const supabase = createClient(supabaseUrl, serviceKey);

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ name, password: hashedPassword, role: 'admin', is_approved: true })
          .eq('id', existingUser.id);

        if (updateError) {
          console.error('❌ Failed to update Placement Officer account:', updateError.message);
        } else {
          console.log(`✅ Placement Officer account (${email}) updated successfully!`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            name,
            email,
            password: hashedPassword,
            role: 'admin',
            is_approved: true
          });

        if (insertError) {
          console.error('❌ Failed to insert Placement Officer into Supabase:', insertError.message);
        } else {
          console.log(`✅ Placement Officer account (${email}) created successfully in Supabase!`);
        }
      }
    } catch (err) {
      console.error('❌ Insertion error:', err.message);
    }
  } else {
    console.log('ℹ️  Note: Supabase credentials in .env are placeholders. To insert directly, fill in .env and rerun.');
  }

  console.log('====================================================\n');
};

run();
