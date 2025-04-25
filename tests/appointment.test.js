require("dotenv").config();
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server"); // Ensure correct path to your Express app
const Appointment = require("../models/Appointments");
const User = require("../models/User");
const Appointments = require("../models/Appointments");

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    console.log("🔗 Connecting to MongoDB for tests...");
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  // ✅ Restore predefined users if missing
  const usersToRestore = [
    { email: "admin@gmail.com", password: "Admin@123", role: "Admin" },
    { email: "priest@gmail.com", password: "Priest@123", role: "Priest" },
    { email: "john@gmail.com", password: "John@123", role: "Devotee" },
  ];

  for (const user of usersToRestore) {
    const existingUser = await User.findOne({ email: user.email });
    if (!existingUser) {
      await User.create({
        firstName: user.role,
        lastName: "User",
        email: user.email,
        phone: "9999999999",
        password: "hashedpassword", // ✅ Avoid bcrypt in test setup
        address: `${user.role} Street`,
        role: user.role,
        empId: `000${Math.floor(Math.random() * 100)}`,
      });
      console.log(`✅ Restored user: ${user.email}`);
    }
  }
});

afterAll(async () => {
  console.log("🛑 Closing MongoDB connection...");
  await mongoose.connection.close();
});

afterEach(async () => {
  await Appointment.deleteMany({ empId: /test\d+/ }); // ✅ Clean up test appointments
});

describe("🔹 Appointment Booking Endpoints", () => {
  let testAppointment;

  beforeEach(async () => {
    testAppointment = await Appointment.create({
      empId: "test123",
      email: "testuser@example.com",
      priest: "Father John",
      priestId: "P001",
      phone: "1234567890",
      date: new Date("2025-02-10T10:00:00.000Z"),
      title: "Test Ceremony",
      firstName: "John",
      address: "123 Church Street",
      status: "Pending",
    });
  });

  // retrieve all Appointments
  it("✅ should retrieve all appointments", async () => {
    // ✅ Create test appointments before the request
    await Appointment.create([
      {
        empId: "test123",
        email: "user1@example.com",
        priest: "Father John",
        priestId: "P001",
        phone: "1234567890",
        date: "2025-02-10T10:00:00.000Z",
        title: "Test Ceremony 1",
        firstName: "John",
        address: "123 Church Street",
        status: "Pending",
      },
      {
        empId: "test456",
        email: "user2@example.com",
        priest: "Father Peter",
        priestId: "P002",
        phone: "0987654321",
        date: "2025-02-12T12:00:00.000Z",
        title: "Test Ceremony 2",
        firstName: "Alice",
        address: "456 Chapel Road",
        status: "Confirmed",
      },
    ]);

    const res = await request(app).get("/get-appointments");

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    // ✅ Check if the created appointments exist in the response
    const appointmentTitles = res.body.map((appointment) => appointment.title);
    expect(appointmentTitles).toContain("Test Ceremony 1");
    expect(appointmentTitles).toContain("Test Ceremony 2");
  });
  it("should return a 500 error if there is a problem fetching appointments", async () => {
    // Mock the Appointment.find method to throw an error
    jest.spyOn(Appointment, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get("/get-appointments");

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error fetching appointments: Database error");
  });

  // book appointment
  it("✅ should successfully book an appointment", async () => {
    const res = await request(app).post("/book-appointment").send({
      empId: "test456",
      email: "newuser@example.com",
      priest: "Father Peter",
      priestId: "P002",
      phone: "0987654321",
      date: "2025-02-15T15:00:00.000Z",
      title: "Wedding Ceremony",
      firstName: "Alice",
      address: "456 Chapel Road",
      status: "pending",
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.priest).toBe("Father Peter");
    expect(res.body.status).toBe("pending");

    // ✅ Verify data is saved in the database
    const savedAppointment = await Appointment.findOne({ empId: "test456" });
    expect(savedAppointment).not.toBeNull();
    expect(savedAppointment.email).toBe("newuser@example.com");
  });

  it("should return a 500 error if there is a problem inserting the appointment", async () => {
    // Mock the Appointment.save method to throw an error
    jest.spyOn(Appointment.prototype, "save").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const appointmentData = {
      empId: "12345",
      email: "test@example.com",
      priest: "Priest Name",
      priestId: "54321",
      phone: "1234567890",
      date: "2025-02-22",
      title: "Test Appointment",
      firstName: "John",
      address: "123 Test St",
      status: "Pending",
    };

    const response = await request(app)
      .post("/book-appointment")
      .send(appointmentData);

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error inserting appointment: Database error");
  });

  // delete appointment
  it("✅ should delete an existing appointment", async () => {
    const res = await request(app).delete(
      `/delete-appointment/${testAppointment._id}`
    );

    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe(
      `Appointment with id ${testAppointment._id} deleted successfully.`
    );

    // ✅ Verify that the appointment is removed from the database
    const deletedAppointment = await Appointment.findById(testAppointment._id);
    expect(deletedAppointment).toBeNull();
  });

  it("should return a 404 error if the appointment is not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();

    const response = await request(app).delete(
      `/delete-appointment/${nonExistentId}`
    );

    expect(response.status).toBe(404);
    expect(response.text).toBe("Appointment not found.");
  });

  it("✅ should return 400 Bad Request when 'title' or 'firstname' or 'priestId' or 'date' is missing", async () => {
    const res = await request(app).post("/book-appointment").send({
      empId: "test789",
      email: "missingtitle@example.com",
      priest: "Father Michael",
      // priestId: "P003",
      phone: "9876543210",
      date: "2025-02-15T10:00:00.000Z",
      // firstName: "Sarah",
      address: "789 Church Avenue",
      status: "Confirmed",
      // ❌ 'title' field is intentionally missing
    });

    expect(res.statusCode).toEqual(400); // ✅ Expecting 400 Bad Request
    expect(res.body.message).toBe("Title is required"); // ✅ Ensure proper error message
  });

  it("should return a 500 error if there is a problem deleting the appointment", async () => {
    // Mock the Appointment.findByIdAndDelete method to throw an error
    jest.spyOn(Appointment, "findByIdAndDelete").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).delete(
      `/delete-appointment/${new mongoose.Types.ObjectId()}`
    );

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error deleting appointment from the database");
  });

  // Update Appointment Status
  it("✅ should update the status of an existing appointment", async () => {
    const updatedStatus = "Confirmed"; // New status to update

    const res = await request(app)
      .patch(`/update-appointment/${testAppointment._id}`)
      .send({ status: updatedStatus });

    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe(updatedStatus);
    expect(res.body._id).toBe(testAppointment._id.toString());

    // ✅ Verify the status is updated in the database
    const updatedAppointment = await Appointment.findById(testAppointment._id);
    expect(updatedAppointment.status).toBe(updatedStatus);
  });

  it("❌ should return 404 if appointment is not found", async () => {
    // Using a non-existing appointment ID
    const invalidAppointmentId = "60b8d295f6c18b6f9b515e7f"; // Random invalid ID

    const res = await request(app)
      .patch(`/update-appointment/${invalidAppointmentId}`)
      .send({ status: "Confirmed" });

    expect(res.statusCode).toEqual(404);
    expect(res.text).toBe("Appointment not found");
  });

  it("should return a 500 error if there is a problem updating the appointment", async () => {
    // Mock the Appointment.findByIdAndUpdate method to throw an error
    jest.spyOn(Appointment, "findByIdAndUpdate").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app)
      .patch(`/update-appointment/${new mongoose.Types.ObjectId()}`)
      .send({ status: "Confirmed" });

    expect(response.status).toBe(500);
    expect(response.text).toBe("Server error");
  });
});
