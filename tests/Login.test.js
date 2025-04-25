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
  let testEmail = `testuser${Date.now()}@example.com`;

  beforeEach(async () => {
    await User.create({
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      phone: '1234567890',
      password: await bcrypt.hash('password', 10),
      address: '123 Test St',
      role: 'Devotee',
      empId: '12345'
    });
  });

  afterEach(async () => {
    await User.deleteMany({ email: /testuser\d+@example\.com/ }); // ✅ Delete only test users
  });

  it('✅ should log in an existing user', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: testEmail,
        password: 'password'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('✅ should not log in with incorrect credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: "john@gmail.com", // ✅ Using an actual existing user
        password: 'wrongpassword'
      });

    expect(res.statusCode).toEqual(400); // ✅ Fixing status code expectation
    expect(res.body.message).toBe('Invalid credentials');
  });
});
