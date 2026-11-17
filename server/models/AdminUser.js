const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  name: { type: String, default: 'System Administrator' }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminUser', AdminUserSchema);

