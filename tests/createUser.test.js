const request = require("supertest");
const app = require("../server");
const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

describe("GET /get-users", () => {
  beforeAll(async () => {
    // Connect to the test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
  });

  afterAll(async () => {
    // Close the database connection
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear the users collection before each test
    await User.deleteMany({});
  });

  it("should retrieve all users", async () => {
    // Create some test users
    const users = [
      {
        firstName: "Test1",
        lastName: "User1",
        email: `testuser1@example.com`,
        phone: "1234567890",
        password: await bcrypt.hash("password", 10),
        address: "123 Test St",
        role: "Devotee",
        empId: "12345",
      },
      {
        firstName: "Test2",
        lastName: "User2",
        email: `testuser2@example.com`,
        phone: "1234567890",
        password: await bcrypt.hash("password", 10),
        address: "123 Test St",
        role: "Devotee",
        empId: "12346",
      },
    ];
    await User.insertMany(users);

    const response = await request(app).get("/get-users");

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.body[0].email).toBe("testuser1@example.com");
    expect(response.body[1].email).toBe("testuser2@example.com");
  });

  it("should return a 500 error if there is a problem retrieving users", async () => {
    // Mock the User.find method to throw an error
    jest.spyOn(User, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get("/get-users");

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error retrieving users from the database");
  });
});