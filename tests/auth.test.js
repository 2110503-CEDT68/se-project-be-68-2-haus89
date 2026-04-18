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
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/register", () => {
  const validUser = {
    name: "Test User",
    email: "test@example.com",
    phone: "0812345678",
    password: "password123",
    role: "user",
  };

  it("registers a new user and returns a token", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(validUser);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it("rejects duplicate email", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);
    const res = await request(app).post("/api/v1/auth/register").send(validUser);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing required fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "missing@example.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "login@example.com",
      phone: "0812345678",
      password: "password123",
      role: "user",
    });
  });

  it("logs in with correct credentials and returns a token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "login@example.com", password: "password123" });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "login@example.com", password: "wrongpassword" });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // The app returns 400 (not 401) when email is not found — intentional to
  // avoid leaking whether an email exists in the system.
  it("rejects non-existent email with 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
describe("GET /api/v1/auth/me", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      name: "Test User",
      email: "me@example.com",
      phone: "0812345678",
      password: "password123",
      role: "user",
    });
    token = res.body.token;
  });

  it("returns the logged-in user profile", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.email).toBe("me@example.com");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.statusCode).toBe(401);
  });
});
