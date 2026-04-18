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
// Helper
// ---------------------------------------------------------------------------

/** Register a user and return { token, id }. */
const registerUser = async (data) => {
  const res = await request(app).post("/api/v1/auth/register").send({ phone: "0812345678", ...data });
  const token = res.body.token;
  const me = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.data._id };
};

// ---------------------------------------------------------------------------
// POST /api/v1/records (admin only)
// ---------------------------------------------------------------------------
describe("POST /api/v1/records", () => {
  it("admin can create a treatment record", async () => {
    const admin   = await registerUser({ name: "Admin",     email: "admin@example.com",   password: "pass123", role: "admin" });
    const patient = await registerUser({ name: "Patient",   email: "patient@example.com", password: "pass123", role: "user",    phone: "0811111111" });
    const dentist = await registerUser({ name: "Dr. Smith", email: "dentist@example.com", password: "pass123", role: "dentist", phone: "0822222222" });

    const res = await request(app)
      .post("/api/v1/records")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        patient: patient.id,
        dentist: dentist.id,
        recordDate: new Date().toISOString(),
        diagnosis: "Cavity on molar",
        treatments: [{ procedureName: "Filling" }],
        prescriptions: [{ medicationName: "Ibuprofen 400mg" }],
        dentistNote: "Patient should avoid sweets.",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.diagnosis).toBe("Cavity on molar");
  });

  it("non-admin cannot create a record", async () => {
    const patient = await registerUser({ name: "Patient",   email: "patient@example.com", password: "pass123", role: "user",    phone: "0811111111" });
    const dentist = await registerUser({ name: "Dr. Smith", email: "dentist@example.com", password: "pass123", role: "dentist", phone: "0822222222" });

    const res = await request(app)
      .post("/api/v1/records")
      .set("Authorization", `Bearer ${patient.token}`)
      .send({
        patient: patient.id,
        dentist: dentist.id,
        recordDate: new Date().toISOString(),
        diagnosis: "Cavity",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/records
// ---------------------------------------------------------------------------
describe("GET /api/v1/records", () => {
  it("patient sees only their own records", async () => {
    const admin   = await registerUser({ name: "Admin",     email: "admin@example.com",   password: "pass123", role: "admin" });
    const patient = await registerUser({ name: "Patient",   email: "patient@example.com", password: "pass123", role: "user",    phone: "0811111111" });
    const dentist = await registerUser({ name: "Dr. Smith", email: "dentist@example.com", password: "pass123", role: "dentist", phone: "0822222222" });

    await request(app)
      .post("/api/v1/records")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ patient: patient.id, dentist: dentist.id, recordDate: new Date().toISOString(), diagnosis: "Test" });

    const res = await request(app)
      .get("/api/v1/records")
      .set("Authorization", `Bearer ${patient.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.every((r) => r.patient._id === patient.id || r.patient === patient.id)).toBe(true);
  });

  it("admin sees all records", async () => {
    const admin   = await registerUser({ name: "Admin",     email: "admin@example.com",   password: "pass123", role: "admin" });
    const patient = await registerUser({ name: "Patient",   email: "patient@example.com", password: "pass123", role: "user",    phone: "0811111111" });
    const dentist = await registerUser({ name: "Dr. Smith", email: "dentist@example.com", password: "pass123", role: "dentist", phone: "0822222222" });

    await request(app)
      .post("/api/v1/records")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ patient: patient.id, dentist: dentist.id, recordDate: new Date().toISOString(), diagnosis: "Test" });

    const res = await request(app)
      .get("/api/v1/records")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/records");
    expect(res.statusCode).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/records/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/records/:id", () => {
  it("dentist can delete their own record", async () => {
    const admin   = await registerUser({ name: "Admin",     email: "admin@example.com",   password: "pass123", role: "admin" });
    const patient = await registerUser({ name: "Patient",   email: "patient@example.com", password: "pass123", role: "user",    phone: "0811111111" });
    const dentist = await registerUser({ name: "Dr. Smith", email: "dentist@example.com", password: "pass123", role: "dentist", phone: "0822222222" });

    const createRes = await request(app)
      .post("/api/v1/records")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ patient: patient.id, dentist: dentist.id, recordDate: new Date().toISOString(), diagnosis: "Test" });

    const recordId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/records/${recordId}`)
      .set("Authorization", `Bearer ${dentist.token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("patient cannot delete a record", async () => {
    const admin   = await registerUser({ name: "Admin",     email: "admin@example.com",   password: "pass123", role: "admin" });
    const patient = await registerUser({ name: "Patient",   email: "patient@example.com", password: "pass123", role: "user",    phone: "0811111111" });
    const dentist = await registerUser({ name: "Dr. Smith", email: "dentist@example.com", password: "pass123", role: "dentist", phone: "0822222222" });

    const createRes = await request(app)
      .post("/api/v1/records")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ patient: patient.id, dentist: dentist.id, recordDate: new Date().toISOString(), diagnosis: "Test" });

    const recordId = createRes.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/records/${recordId}`)
      .set("Authorization", `Bearer ${patient.token}`);

    // The app uses 403 (Forbidden) when authenticated but not authorized
    expect(res.statusCode).toBe(403);
  });
});
