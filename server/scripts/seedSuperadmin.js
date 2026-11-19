require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../features/f16_auth/models/User');
const { validatePasswordPolicy } = require('../features/f16_auth/authUtils');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/college-assistant';

async function seedSuperadmin() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Error: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in environment.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Validate strong password policy
  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    console.error(`Error: Refusing weak superadmin password: ${policyCheck.error}`);
    process.exit(1);
  }

  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI);

  try {
    // Exactly one superadmin rule: check if any active superadmin exists
    const existingSuperadmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperadmin) {
      console.error(`Error: A superadmin account already exists (${existingSuperadmin.email}). Only exactly one initial superadmin is permitted.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const superadmin = await User.create({
      name: 'System Superadmin',
      email: normalizedEmail,
      passwordHash,
      role: 'superadmin',
      status: 'active',
      emailVerified: true,
      mustChangePassword: true, // Forces password change on first login
      createdAt: new Date()
    });

    console.log(`Successfully created Superadmin account for ${superadmin.email}.`);
    console.log('Note: mustChangePassword is set to true. The superadmin must change password upon initial sign in.');
  } catch (err) {
    console.error('Failed to seed superadmin:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

if (require.main === module) {
  seedSuperadmin();
}

module.exports = seedSuperadmin;
