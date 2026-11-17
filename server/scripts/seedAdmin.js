require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college_assistant';

async function seedAdmin() {
  console.log('[Seed] Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  } catch (err) {
    console.warn(`[Seed] MongoDB connection skipped: ${err.message}. Proceeding.`);
    return;
  }

  const username = process.env.ADMIN_DEFAULT_USER || 'admin';
  const rawPassword = process.env.ADMIN_DEFAULT_PASS || 'Admin@123';
  const email = process.env.ADMIN_DEFAULT_EMAIL || 'admin@college.edu.in';

  const existing = await AdminUser.findOne({ username });
  if (existing) {
    console.log(`[Seed] Admin user '${username}' already exists.`);
    await mongoose.disconnect();
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(rawPassword, salt);

  const admin = await AdminUser.create({
    username,
    email,
    password_hash,
    role: 'superadmin',
    name: 'Campus Administrator'
  });

  console.log(`[Seed] Admin user '${admin.username}' created successfully.`);
  await mongoose.disconnect();
}

seedAdmin().catch(console.error);

