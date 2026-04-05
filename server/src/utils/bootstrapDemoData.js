const User = require('../models/User');
const DeliveryZone = require('../models/DeliveryZone');
const { DEFAULT_ZONE_FEES } = require('./deliveryFee');

async function ensureDemoData() {
  const demoUsers = [
    { fullName: 'admin', email: 'admin@gmail.com', role: 'admin', phone: '08012341234', password: 'admin123' },
    { fullName: 'admin2', email: 'admin2@gmail.com', role: 'admin', phone: '08023412341', password: 'admin123' },
    { fullName: 'user', email: 'user@gmail.com', role: 'customer', phone: '08034123412', password: 'user123' },
    { fullName: 'user2', email: 'user2@gmail.com', role: 'customer', phone: '08045123412', password: 'user123' },
    { fullName: 'staff', email: 'staff@gmail.com', role: 'staff', phone: '08056123412', password: 'staff123' },
    { fullName: 'staff2', email: 'staff2@gmail.com', role: 'staff', phone: '08067123412', password: 'staff123' },
    { fullName: 'rider', email: 'rider@gmail.com', role: 'rider', phone: '08078123412', password: 'rider123' },
    { fullName: 'rider2', email: 'rider2@gmail.com', role: 'rider', phone: '08089123412', password: 'rider123' },
    { fullName: 'support', email: 'support@gmail.com', role: 'support', phone: '08090123412', password: 'support123' },
    { fullName: 'support2', email: 'support2@gmail.com', role: 'support', phone: '08001012341', password: 'support123' },
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

  const existingZones = await DeliveryZone.countDocuments();
  if (!existingZones) {
    const defaults = Object.entries(DEFAULT_ZONE_FEES).map(([key, fee], index) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      fee,
      isActive: true,
      sortOrder: index,
    }));
    await DeliveryZone.insertMany(defaults);
  }

}

module.exports = ensureDemoData;