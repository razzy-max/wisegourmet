require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  // Delete all non-customer users (keep customer data for demo)
  await User.deleteMany({ role: { $in: ['admin', 'staff', 'rider', 'support'] } });

  const demoUsers = [
    // Admin users
    {
      fullName: 'admin',
      email: 'admin@gmail.com',
      role: 'admin',
      phone: '08012341234',
      password: 'admin123',
    },
    {
      fullName: 'admin2',
      email: 'admin2@gmail.com',
      role: 'admin',
      phone: '08023412341',
      password: 'admin123',
    },
    // Customer users
    {
      fullName: 'user',
      email: 'user@gmail.com',
      role: 'customer',
      phone: '08034123412',
      password: 'user123',
    },
    {
      fullName: 'user2',
      email: 'user2@gmail.com',
      role: 'customer',
      phone: '08045123412',
      password: 'user123',
    },
    // Staff users
    {
      fullName: 'staff',
      email: 'staff@gmail.com',
      role: 'staff',
      phone: '08056123412',
      password: 'staff123',
    },
    {
      fullName: 'staff2',
      email: 'staff2@gmail.com',
      role: 'staff',
      phone: '08067123412',
      password: 'staff123',
    },
    // Rider users
    {
      fullName: 'rider',
      email: 'rider@gmail.com',
      role: 'rider',
      phone: '08078123412',
      password: 'rider123',
    },
    {
      fullName: 'rider2',
      email: 'rider2@gmail.com',
      role: 'rider',
      phone: '08089123412',
      password: 'rider123',
    },
    // Support users
    {
      fullName: 'support',
      email: 'support@gmail.com',
      role: 'support',
      phone: '08090123412',
      password: 'support123',
    },
    {
      fullName: 'support2',
      email: 'support2@gmail.com',
      role: 'support',
      phone: '08001012341',
      password: 'support123',
    },
  ];

  for (const demoUser of demoUsers) {
    const email = demoUser.email.toLowerCase();
    const existing = await User.findOne({ email });

    if (!existing) {
      await User.create({
        fullName: demoUser.fullName,
        email,
        password: demoUser.password,
        role: demoUser.role,
        phone: demoUser.phone,
        isActive: true,
      });
      continue;
    }

    existing.fullName = demoUser.fullName;
    existing.password = demoUser.password;
    existing.role = demoUser.role;
    existing.phone = demoUser.phone;
    existing.isActive = true;
    await existing.save();
  }

  console.log('Seed completed successfully');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
