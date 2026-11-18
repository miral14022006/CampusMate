require('dotenv').config();
const mongoose = require('mongoose');
const AdminUser = require('../models/AdminUser');
const User = require('../features/f16_auth/models/User');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/college-assistant';

async function migrateAdminUsers() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  try {
    const legacyAdmins = await AdminUser.find({});
    console.log(`Found ${legacyAdmins.length} legacy AdminUser document(s) to migrate.`);

    let migrated = 0;
    let skipped = 0;

    for (const legacy of legacyAdmins) {
      const email = (legacy.email || `${legacy.username}@campusmate.pdeu.ac.in`).toLowerCase().trim();
      const existing = await User.findOne({ email });

      if (existing) {
        console.log(`User with email ${email} already exists in User collection. Skipping.`);
        skipped++;
        continue;
      }

      await User.create({
        name: legacy.name || legacy.username || 'System Administrator',
        email,
        passwordHash: legacy.password_hash,
        role: legacy.role === 'superadmin' ? 'superadmin' : 'admin',
        status: 'active',
        emailVerified: true,
        mustChangePassword: false,
        createdAt: legacy.createdAt || new Date()
      });

      console.log(`Migrated AdminUser "${legacy.username}" (${email}) to User with role "${legacy.role || 'admin'}".`);
      migrated++;
    }

    console.log(`\nMigration completed.`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Original AdminUser documents have been preserved.`);
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

if (require.main === module) {
  migrateAdminUsers();
}

module.exports = migrateAdminUsers;
