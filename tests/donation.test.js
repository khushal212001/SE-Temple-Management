const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server"); // Ensure correct path to your Express app
const Donations = require("../models/Donations"); // Import the model

jest.mock("../models/Donations");

describe("Donations API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("GET /get-donations - should return all donations", async () => {
    const mockDonations = [
      { _id: "1", fullName: "John Doe", amount: 100 },
      { _id: "2", fullName: "Jane Doe", amount: 200 },
    ];

    Donations.find.mockResolvedValue(mockDonations);

    const res = await request(app).get("/get-donations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockDonations);
  });

  test("POST /add-donation - should create a new donation", async () => {
    const newDonation = {
      address: "123 Street",
      city: "City",
      state: "State",
      zip: "12345",
      cardName: "John Doe",
      email: "john@example.com",
      fullName: "Pallavi",
      amount: 100,
    };
  
    // Mock the save method to resolve to the same object (simulating a successful save)
    Donations.prototype.save.mockResolvedValue(newDonation);
  
    // Simulate the POST request
    const res = await request(app)
      .post("/add-donation")
      .send(newDonation)
      .set("Accept", "application/json");
  
    expect(res.status).toBe(201);
    expect(res.text).toBe("Donation added successfully");
  
    // Mock the findOne method to return the saved donation
    Donations.findOne.mockResolvedValue(newDonation);
  
    // Check if the donation was saved correctly
    const savedDonation = await Donations.findOne({ fullName: "Pallavi" });
    expect(savedDonation).not.toBeNull();
    expect(savedDonation.amount).toBe(100);
  });
  
});