// Generate ADMIN_PASSWORD_HASH for .env.local
// Run: node scripts/generate-admin-hash.js YourPassword

const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.log('Usage: node scripts/generate-admin-hash.js <your-password>');
  process.exit(1);
}
bcrypt.hash(password, 10).then((h) => {
  console.log('Add this to .env.local:\nADMIN_PASSWORD_HASH=' + h);
});
