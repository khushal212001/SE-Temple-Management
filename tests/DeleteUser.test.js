const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Suppress expected console errors in tests
beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  
  afterAll(() => {
    console.error.mockRestore(); // Restore console after tests
  });
  
describe("🔹 DELETE /delete-user/:id", () => {
  let testUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // ✅ Create a test user
    testUser = await User.create({
      firstName: "Test",
      lastName: "User",
      email: `testuser${Date.now()}@example.com`,
      phone: "1234567890",
      password: await bcrypt.hash("password", 10),
      address: "123 Test St",
      role: "Devotee",
      empId: "12345",
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it("✅ should delete a user successfully", async () => {
    const res = await request(app).delete(`/delete-user/${testUser._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe(`User with id ${testUser._id} deleted successfully.`);

    // Ensure user is actually deleted
    const deletedUser = await User.findById(testUser._id);
    expect(deletedUser).toBeNull();
  });

  it("❌ should return 404 when deleting a non-existent user", async () => {
    const nonExistentUserId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/delete-user/${nonExistentUserId}`);

    expect(res.statusCode).toBe(404);
    expect(res.text).toBe("User not found.");
  });

  it("🔒 should return 500 for an invalid user ID format", async () => {
    const res = await request(app).delete("/delete-user/invalidID");
  
    expect(res.statusCode).toBe(500);
    expect(res.text).toBe("Error deleting user from the database");
  });
});
