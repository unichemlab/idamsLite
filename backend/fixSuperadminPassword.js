// Run this script with: node fixSuperadminPassword.js
// It will update the password for superadmin1 to 'superadmin123'

const bcrypt = require('bcrypt');
const db = require('./src/config/db');

async function updateSuperadminPassword() {
  const username = 'superadmin1';
  const newPassword = 'superadmin123';
  const hash = await bcrypt.hash(newPassword, 12);
  const updateQuery = `UPDATE user_master SET password_hash = $1 WHERE username = $2`;
  try {
    const result = await db.query(updateQuery, [hash, username]);
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    db.end && db.end();
  }
}

updateSuperadminPassword();
