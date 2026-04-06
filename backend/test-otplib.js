const { generateSecret, verify, generateURI } = require('otplib');

async function test() {
  try {
    const secret = generateSecret();
    console.log('Secret:', secret);
    
    const uri = generateURI({ label: 'test@example.com', issuer: 'CAT ERP', secret });
    console.log('URI:', uri);
    
    // We can't easily generate a valid token without a TOTP instance or await generate
    // but we can check if they exist.
    console.log('Functions are available');
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
