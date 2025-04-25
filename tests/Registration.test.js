require('dotenv').config();
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    console.log("🔗 Connecting to MongoDB for tests...");
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }

  // ✅ Restore predefined users if missing
  const usersToRestore = [
    { email: "admin@gmail.com", password: "Admin@123", role: "Admin" },
    { email: "priest@gmail.com", password: "Priest@123", role: "Priest" },
    { email: "john@gmail.com", password: "John@123", role: "Devotee" }
  ];

  for (const user of usersToRestore) {
    const existingUser = await User.findOne({ email: user.email });
    if (!existingUser) {
      await User.create({
        firstName: user.role,
        lastName: "User",
        email: user.email,
        phone: "9999999999",
        password: await bcrypt.hash(user.password, 10),
        address: `${user.role} Street`,
        role: user.role,
        empId: `000${Math.floor(Math.random() * 100)}`
      });
      console.log(`✅ Restored user: ${user.email}`);
    }
  }
});

afterAll(async () => {
  console.log("🛑 Closing MongoDB connection...");
  await mongoose.connection.close();
});

describe('🔹 Auth Endpoints', () => {
  let newTestEmail = `newuser${Date.now()}@example.com`; // ✅ Unique email for sign-up

  it('✅ should sign up a new user', async () => {
    const res = await request(app)
      .post('/signup')
      .send({
        firstName: 'New',
        lastName: 'User',
        email: newTestEmail, // ✅ Always a unique email
        phone: '0987654321',
        password: 'password',
        address: '456 New St'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.email).toBe(newTestEmail);
  });
});
