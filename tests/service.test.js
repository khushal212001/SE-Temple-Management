const request = require("supertest");
const app = require("../server"); // Import your Express app
const mongoose = require("mongoose");
const Service = require("../models/Service");

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    // Check if already connected
    await mongoose.connect("mongodb://localhost:27017/testdb", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
});

afterAll(async () => {
  await mongoose.disconnect(); // Properly close the connection
});

describe("Services API", () => {
  let serviceId; // Store the created service ID

  test("POST /add-service - should create a new service", async () => {
    const res = await request(app)
      .post("/add-service")
      .field("title", "Test Service")
      .field("description", "Test Service Description")
      .field("cost", "100")
      .attach("serviceImage", Buffer.from("test-image-data"), "test.jpg")
      .set("Accept", "application/json");

    console.log("Response Status:", res.status);
    console.log("Response Text:", res.text);

    expect(res.status).toBe(201);
    expect(res.text).toBe("Service added successfully");

    const service = await Service.findOne({ title: "Test Service" });
    expect(service).not.toBeNull();
    serviceId = service._id.toString();
  });

  it("should return a 500 error if there is a problem adding the service", async () => {
    // Mock the Service.save method to throw an error
    jest.spyOn(Service.prototype, "save").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const serviceData = {
      title: "Test Service",
      cost: 100,
      description: "This is a test service",
    };

    const response = await request(app)
      .post("/add-service")
      .field("title", serviceData.title)
      .field("cost", serviceData.cost)
      .field("description", serviceData.description);

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error adding service to the database");
  });

  test("GET /services - should fetch all services", async () => {
    const res = await request(app)
      .get("/services")
      .set("Accept", "application/json");

    // console.log("Services Fetched:", res.body);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("PUT /services/:id - should update an existing service", async () => {
    const res = await request(app)
      .put(`/services/${serviceId}`)
      .field("title", "Updated Service")
      .field("description", "Updated Description")
      .field("cost", "150")
      .attach("serviceImage", Buffer.from("updated-image-data"), "updated.jpg")
      .set("Accept", "application/json");

    console.log("Updated Service Response:", res.body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "Updated Service",
      description: "Updated Description",
      cost: "150",
    });
  });

  test("DELETE /services/:id - should delete a service", async () => {
    const res = await request(app)
      .delete(`/services/${serviceId}`)
      .set("Accept", "application/json");

    console.log("Delete Response:", res.text);

    expect(res.status).toBe(200);
    expect(res.text).toBe(`Service with id ${serviceId} deleted successfully.`);

    const deletedService = await Service.findById(serviceId);
    expect(deletedService).toBeNull();
  });
});
