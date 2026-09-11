// Generate ADMIN_PASSWORD_HASH for .env.local
// Run: node scripts/generate-admin-hash.js YourPassword

const bcrypt = require('bcryptjs');
const password = process.argv[2];
if (!password) {
  console.log('Usage: node scripts/generate-admin-hash.js <your-password>');
  process.exit(1);
}
bcrypt.hash(password, 12).then((h) => {
  const payload = h.replace(/^\$2[aby]\$\d{2}\$/, '');
  const version = h.slice(1, 3);
  const cost = h.slice(4, 6);
  console.log('Add this to .env.local:');
  console.log('ADMIN_PASSWORD_HASH=' + version + '|' + cost + '|' + payload);
});
