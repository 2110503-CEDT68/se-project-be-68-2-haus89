const request = require("supertest");
const app = require("../app");
const { connectTestDB, clearTestDB, closeTestDB } = require("./setup");

beforeAll(async () => {
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRE = "1d";
  process.env.JWT_COOKIE_EXPIRE = "1";
  await connectTestDB();
});
afterEach(async () => await clearTestDB());
afterAll(async () => await closeTestDB());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Register a user and return { token, id }. */
const registerUser = async (overrides = {}) => {
  const data = {
    name: "Test User",
    email: "user@example.com",
    phone: "0812345678",
    password: "password123",
    role: "user",
    ...overrides,
  };
  const res = await request(app).post("/api/v1/auth/register").send(data);
  const token = res.body.token;
  const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.data._id };
};

/** Register a dentist, add a slot for tomorrow, return { dentistId, date }. */
const createDentistWithSlot = async (adminToken) => {
  const { token: dentistToken, id: dentistId } = await registerUser({
    name: "Dr. Smith",
    email: "dentist@example.com",
    phone: "0819876543",
    role: "dentist",
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  await request(app)
    .post(`/api/v1/dentists/${dentistId}/slots`)
    .set("Authorization", `Bearer ${dentistToken}`)
    .send({ date: dateStr, startTime: "10:00", endTime: "11:00" });

  return { dentistId, date: dateStr };
};

// ---------------------------------------------------------------------------
// POST /api/v1/bookings
// ---------------------------------------------------------------------------
describe("POST /api/v1/bookings", () => {
  it("creates a booking on an available slot", async () => {
    const admin = await registerUser({ email: "admin@example.com", role: "admin" });
    const user  = await registerUser({ email: "patient@example.com", phone: "0811111111" });
    const { dentistId, date } = await createDentistWithSlot(admin.token);

    const res = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ dentist: dentistId, date, startTime: "10:00", endTime: "11:00" });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dentist).toBe(dentistId);
  });

  it("rejects booking without authentication", async () => {
    const res = await request(app)
      .post("/api/v1/bookings")
      .send({ dentist: "someid", date: "2099-01-01", startTime: "10:00", endTime: "11:00" });

    expect(res.statusCode).toBe(401);
  });

  it("rejects a second booking from the same user", async () => {
    const admin = await registerUser({ email: "admin@example.com", role: "admin" });
    const user  = await registerUser({ email: "patient@example.com", phone: "0811111111" });
    const { dentistId, date } = await createDentistWithSlot(admin.token);

    await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ dentist: dentistId, date, startTime: "10:00", endTime: "11:00" });

    const res = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ dentist: dentistId, date, startTime: "10:00", endTime: "11:00" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/bookings/me
// ---------------------------------------------------------------------------
describe("GET /api/v1/bookings/me", () => {
  it("returns the user's own booking", async () => {
    const admin = await registerUser({ email: "admin@example.com", role: "admin" });
    const user  = await registerUser({ email: "patient@example.com", phone: "0811111111" });
    const { dentistId, date } = await createDentistWithSlot(admin.token);

    await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ dentist: dentistId, date, startTime: "10:00", endTime: "11:00" });

    const res = await request(app)
      .get("/api/v1/bookings/me")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.dentist).toBeDefined();
  });

  it("returns 404 when user has no booking", async () => {
    const user = await registerUser({ email: "nobody@example.com" });

    const res = await request(app)
      .get("/api/v1/bookings/me")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/bookings/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/bookings/:id", () => {
  it("allows user to cancel their own booking", async () => {
    const admin = await registerUser({ email: "admin@example.com", role: "admin" });
    const user  = await registerUser({ email: "patient@example.com", phone: "0811111111" });
    const { dentistId, date } = await createDentistWithSlot(admin.token);

    const bookingRes = await request(app)
      .post("/api/v1/bookings")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ dentist: dentistId, date, startTime: "10:00", endTime: "11:00" });

    const bookingId = bookingRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/bookings/${bookingId}`)
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
