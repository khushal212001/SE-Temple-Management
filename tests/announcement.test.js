const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server"); // Ensure correct path to your Express app
const Announcement = require("../models/Announcement"); // Import the model

jest.mock("../models/Announcement");

describe("Announcements API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("GET /announcements - should return all announcements", async () => {
    const mockAnnouncements = [
      {
        _id: "1",
        title: "Test 1",
        description: "Desc 1",
        announcementImage: null,
      },
      {
        _id: "2",
        title: "Test 2",
        description: "Desc 2",
        announcementImage: null,
      },
    ];

    Announcement.find.mockResolvedValue(mockAnnouncements);

    const res = await request(app).get("/announcements");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockAnnouncements);
  });

  it("should return a 404 error if the announcement is not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();

    const response = await request(app).delete(
      `/announcements/${nonExistentId}`
    );

    expect(response.status).toBe(404);
    expect(response.text).toBe("Announcement not found.");
  });

  test("POST /add-announcement - should create a new announcement", async () => {
    const res = await request(app)
      .post("/add-announcement")
      .field("title", "New Announcement")
      .field("description", "This is a test announcement")
      .attach("announcementImage", Buffer.from("test-image-data"), "test.jpg")
      .set("Accept", "application/json");

    console.log("Response Status:", res.status);
    console.log("Response Text:", res.text);

    expect(res.status).toBe(201);
    expect(res.text).toBe("");

    const announcement = await Announcement.findOne({
      title: "New Announcement",
    });
    expect(announcement).not.toBeNull();
  });

  it("should return a 500 error if there is a problem adding the announcement", async () => {
    // Mock the Announcement.save method to throw an error
    jest.spyOn(Announcement.prototype, "save").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const announcementData = {
      title: "New Announcement",
      description: "This is a test announcement",
    };

    const response = await request(app)
      .post("/add-announcement")
      .field("title", announcementData.title)
      .field("description", announcementData.description);

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error adding announcement: Database error");
  });

  it("should return a 500 error if there is a problem fetching announcements", async () => {
    // Mock the Announcement.find method to throw an error
    jest.spyOn(Announcement, "find").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await request(app).get("/announcements");

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error fetching announcements: Database error");
  });

  test("PUT /announcements/:id - should update an existing announcement", async () => {
    const updatedAnnouncement = {
      _id: "1",
      title: "Updated Title",
      description: "Updated Description",
      announcementImage: null,
    };

    Announcement.findByIdAndUpdate.mockResolvedValue(updatedAnnouncement);

    const res = await request(app)
      .put("/announcements/1")
      .send({ title: "Updated Title", description: "Updated Description" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
  });

  it("should return a 500 error if there is a problem updating the announcement", async () => {
    // Mock the Announcement.findByIdAndUpdate method to throw an error
    jest.spyOn(Announcement, "findByIdAndUpdate").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const updatedData = {
      title: "New Title",
      description: "New Description",
    };

    const response = await request(app)
      .put(`/announcements/invalid-id`)
      .send(updatedData);

    expect(response.status).toBe(500);
    expect(response.text).toBe("Error updating announcement: Database error");
  });

  test("DELETE /announcements/:id - should delete an announcement", async () => {
    Announcement.findByIdAndDelete.mockResolvedValue({ _id: "1" });

    const res = await request(app).delete("/announcements/1");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Announcement with id 1 deleted successfully.");
  });
});