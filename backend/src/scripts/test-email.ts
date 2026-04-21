import 'dotenv/config';
import nodemailer from 'nodemailer';
import { transporter } from '../utils/email';

async function testPort(port: number, secure: boolean) {
  console.log(`\n--- Testing Port ${port} (Secure: ${secure}) ---`);
  const testTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: port,
    secure: secure,
    auth: {
      user: String(process.env.SMTP_USER).trim(),
      pass: String(process.env.SMTP_PASS).trim(),
      type: 'login' // Force login type
    },
    debug: true, // Enable debug output
    logger: true // Enable logging
  });

  try {
    await testTransporter.verify();
    console.log(`✅ Connection to Port ${port} successful!`);
    return true;
  } catch (error: any) {
    console.error(`❌ Port ${port} failed: ${error.message}`);
    return false;
  }
}

async function testEmail() {
  console.log('--- Testing Brevo SMTP Configuration ---');
  console.log('SMTP_USER:', process.env.SMTP_USER);

  const results = [];
  results.push(await testPort(587, false));
  results.push(await testPort(465, true));
  results.push(await testPort(2525, false));

  if (results.some(r => r)) {
    console.log('\n✅ At least one configuration worked!');
  } else {
    console.error('\n❌ All configurations failed. This strongly suggests the SMTP Key or Username is incorrect in .env.');
  }
}

testEmail();
