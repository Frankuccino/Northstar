import request from "supertest";
import { describe, afterEach, it, expect, beforeEach } from "vitest";
import app from "../src/app.js";
import { db } from "../src/db/index.js";
import { users, employees } from "../src/db/schema.js";
import { eq } from "drizzle-orm";

const TEST_ADMIN = {
  email: "admin@test.com",
  password: "123456",
  name: "Admin",
};

const TEST_USER = {
  email: "user@test.com",
  password: "123456",
  name: "User",
};

const VALID_EMPLOYEE = {
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  position: "Engineer",
  department: "Engineering",
};

// Helper: register, promote, and log in — returns a bearer token
async function createAdminAndLogin(): Promise<string> {
  await request(app).post("/auth/register").send(TEST_ADMIN);

  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, TEST_ADMIN.email));

  const login = await request(app).post("/auth/login").send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });

  return login.body.token;
}

async function createUserAndLogin(): Promise<string> {
  await request(app).post("/auth/register").send({
    email: TEST_USER.email,
    password: TEST_USER.password,
    name: TEST_USER.name,
  });
  const login = await request(app).post("/auth/login").send({
    email: TEST_USER.email,
    password: TEST_USER.password,
  });
  return login.body.token;
}

async function createManagerAndLogin(): Promise<string> {
  await request(app).post("/auth/register").send({
    email: "manager.test@example.com",
    password: TEST_PASSWORD,
    name: "Manager",
  });
  await db
    .update(users)
    .set({ role: "manager" })
    .where(eq(users.email, "manager.test@example.com"));

  const login = await request(app).post("/auth/login").send({
    email: "manager.test@example.com",
    password: TEST_PASSWORD,
  });

  return login.body.token;
}

// Helper: wipe the test user after each test
async function cleanup() {
  await db.delete(users).where(eq(users.email, TEST_ADMIN.email));
  await db.delete(users).where(eq(users.email, TEST_USER.email));
  await db.delete(employees).where(eq(employees.email, "manager.test@example.com"));
  await db.delete(employees).where(eq(employees.email, VALID_EMPLOYEE.email));
}

describe("GET /employees", () => {
  afterEach(async () => {
    await cleanup();
  });
  // Unauthenticated Request (No Token)
  it("should reject unauthenticated requests (401)", async () => {
    const res = await request(app).get("/employees");
    expect(res.status).toBe(401);
  });
  // Authentication - Invalid Token
  it("should reject an invalid token (401 | 403)", async () => {
    const res = await request(app)
      .get("/employees")
      .set("Authorization", "Bearer invalid_token");
    expect([401, 403]).toContain(res.status);
  });
  // Authorization - Authenticated | Valid Role (Admin)
  it("should allow an admin to fetch employees (200)", async () => {
    const token = await createAdminAndLogin();

    const res = await request(app)
      .get("/employees")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined(); // add shape assertions as your API matures
  });
  // Authorization - Authenticated | Invalid Role (User)
  it("should reject a non-admin user with (403)", async () => {
    const token = await createUserAndLogin();

    const res = await request(app)
      .get("/employees")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("should allow a manager to fetch employees (200)", async () => {
    const token = await createManagerAndLogin();

    const res = await request(app)
      .get("/employees")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it("should reject a manager from creating employee (403)", async () => {
    const token = await createManagerAndLogin();

    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_EMPLOYEE);

    expect(res.status).toBe(403);
  });
});

// POST /employees
describe("POST /employees", () => {
  afterEach(cleanup);

  it("should reject unauthenticated requests (401)", async () => {
    const res = await request(app).post("/employees").send(VALID_EMPLOYEE);
    expect(res.status).toBe(401);
  });

  it("should reject a non-admin user (403)", async () => {
    const token = await createUserAndLogin();
    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_EMPLOYEE);
    expect(res.status).toBe(403);
  });

  it("should reject invalid employee data (400)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "not-an-email" }); // missing fields + bad email
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("should create an employee as admin (201)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_EMPLOYEE);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    });
  });
});

// GET /employees/:id
describe("GET /employees/:id", () => {
  let createdEmployeeId: number;

  beforeEach(async () => {
    // create a real employee to fetch
    const token = await createAdminAndLogin();
    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_EMPLOYEE);
    createdEmployeeId = res.body.id;
  });

  afterEach(cleanup);

  it("should reject unauthenticated requests (401)", async () => {
    const res = await request(app).get(`/employees/${createdEmployeeId}`);
    expect(res.status).toBe(401);
  });

  it("should reject a non-admin user (403)", async () => {
    const token = await createUserAndLogin();
    const res = await request(app)
      .get(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("should return 404 for a non-existent employee", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .get("/employees/999999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("should return an employee by id (200)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .get(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
    });
  });
});

describe("PATCH /employees/:id", () => {
  let createdEmployeeId: number;
  beforeEach(async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_EMPLOYEE);
    createdEmployeeId = res.body.id;
  });

  afterEach(cleanup);

  it("should reject unauthenticated requests (401)", async () => {
    const res = await request(app)
      .patch(`/employees/${createdEmployeeId}`)
      .send({ firstName: "Jane" });
    expect(res.status).toBe(401);
  });

  it("should reject a non-admin user (403)", async () => {
    const token = await createUserAndLogin();
    const res = await request(app)
      .patch(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Jane" });
    expect(res.status).toBe(403);
  });

  it("should reject invalid update data (400)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .patch(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("should return 404 for a non-existent employee (404)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .patch("/employees/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Jane" });
    expect(res.status).toBe(404);
  });

  it("should update an employee as admin (200)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .patch(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ firstName: "Jane", department: "Marketing" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      firstName: "Jane",
      department: "Marketing",
      email: "john@example.com", // unchanged fields stay the same
    });
  });
});

// DELETE /employees/:id
describe("DELETE /employees/:id", () => {
  let createdEmployeeId: number;

  beforeEach(async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .post("/employees")
      .set("Authorization", `Bearer ${token}`)
      .send(VALID_EMPLOYEE);
    createdEmployeeId = res.body.id;
  });

  afterEach(cleanup);

  it("should reject unauthenticated requests (401)", async () => {
    const res = await request(app).delete(`/employees/${createdEmployeeId}`);
    expect(res.status).toBe(401);
  });

  it("should reject a non-admin user (403)", async () => {
    const token = await createUserAndLogin();
    const res = await request(app)
      .delete(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("should return 404 for a non-existent employee (404)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .delete("/employees/999999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("should delete an employee as admin (200)", async () => {
    const token = await createAdminAndLogin();
    const res = await request(app)
      .delete(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: "Employee deleted succesfully" });
  });

  it("should return 404 after already being deleted (404)", async () => {
    const token = await createAdminAndLogin();
    await request(app)
      .delete(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`);
    // try to delete the same employee again
    const res = await request(app)
      .delete(`/employees/${createdEmployeeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
