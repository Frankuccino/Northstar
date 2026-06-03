import { db } from "./index.js";
import { users, employees } from "./schema.js";
import bcrypt from "bcrypt";

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: "admin" | "manager" | "employee";
};

type SeedEmployee = {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  role: SeedUser["role"];
};

const usersToSeed: SeedUser[] = [
  { email: "admin@example.com", name: "System Admin", password: "password123", role: "admin" },
  { email: "manager@example.com", name: "Ops Manager", password: "password123", role: "manager" },
  { email: "ceo.user@example.com", name: "Chief Executive", password: "password123", role: "employee" },
  { email: "cto.user@example.com", name: "Chief Technology", password: "password123", role: "employee" },
  { email: "cmo.user@example.com", name: "Chief Marketing", password: "password123", role: "employee" },
  { email: "cfo.user@example.com", name: "Chief Finance", password: "password123", role: "employee" },
  { email: "coo.user@example.com", name: "Chief Operations", password: "password123", role: "employee" },
  { email: "ciso.user@example.com", name: "Chief Security", password: "password123", role: "employee" },
];

function buildEmployees(): SeedEmployee[] {
  const list: SeedEmployee[] = [
    { firstName: "Alexis", lastName: "Vance", email: "alexis.vance@example.com", position: "CEO", department: "Executive", role: "employee" },
    { firstName: "Morgan", lastName: "Reeves", email: "morgan.reeves@example.com", position: "CTO", department: "Engineering", role: "employee" },
    { firstName: "Jordan", lastName: "Park", email: "jordan.park@example.com", position: "CMO", department: "Marketing", role: "employee" },
    { firstName: "Riley", lastName: "Shaw", email: "riley.shaw@example.com", position: "CFO", department: "Finance", role: "employee" },
    { firstName: "Taylor", lastName: "Nguyen", email: "taylor.nguyen@example.com", position: "COO", department: "Operations", role: "employee" },
    { firstName: "Casey", lastName: "Brooks", email: "casey.brooks@example.com", position: "CISO", department: "Security", role: "employee" },
    { firstName: "Jamie", lastName: "Reyes", email: "jamie.reyes@example.com", position: "VP Engineering", department: "Engineering", role: "employee" },
    { firstName: "Drew", lastName: "Patel", email: "drew.patel@example.com", position: "Engineering Manager", department: "Engineering", role: "manager" },
    { firstName: "Sam", lastName: "Kim", email: "sam.kim@example.com", position: "Senior Engineer", department: "Engineering", role: "employee" },
    { firstName: "Robin", lastName: "Costa", email: "robin.costa@example.com", position: "Engineer", department: "Engineering", role: "employee" },
    { firstName: "Avery", lastName: "Lopez", email: "avery.lopez@example.com", position: "QA Lead", department: "Engineering", role: "employee" },
    { firstName: "Blake", lastName: "Ahmed", email: "blake.ahmed@example.com", position: "Product Manager", department: "Product", role: "employee" },
    { firstName: "Charlie", lastName: "Müller", email: "charlie.muller@example.com", position: "Designer", department: "Product", role: "employee" },
    { firstName: "Dakota", lastName: "Silva", email: "dakota.silva@example.com", position: "Marketing Lead", department: "Marketing", role: "employee" },
    { firstName: "Emerson", lastName: "Johal", email: "emerson.johal@example.com", position: "Content Strategist", department: "Marketing", role: "employee" },
    { firstName: "Finley", lastName: "Ortiz", email: "finley.ortiz@example.com", position: "Accountant", department: "Finance", role: "employee" },
    { firstName: "Harper", lastName: "Dupont", email: "harper.dupont@example.com", position: "Operations Lead", department: "Operations", role: "employee" },
    { firstName: "Kai", lastName: "Ivanova", email: "kai.ivanova@example.com", position: "Security Analyst", department: "Security", role: "employee" },
    { firstName: "Logan", lastName: "Fernandez", email: "logan.fernandez@example.com", position: "HR Business Partner", department: "HR", role: "employee" },
    { firstName: "Mackenzie", lastName: "Stone", email: "mackenzie.stone@example.com", position: "Recruiter", department: "HR", role: "employee" },
  ];

  return list;
}

async function seed() {
  const hashed = await bcrypt.hash("password123", 10);

  const insertedUsers = await db
    .insert(users)
    .values(usersToSeed.map(({ email, name, role }) => ({ email, name, password: hashed, role })))
    .onConflictDoNothing()
    .returning();

  const seededUsers = insertedUsers;
  const emailToId = new Map(seededUsers.map((u) => [u.email, u.id]));

  const fallbackAdminId = emailToId.get("admin@example.com");
  const fallbackManagerId = emailToId.get("manager@example.com");

  if (!fallbackAdminId || !fallbackManagerId) {
    console.log("Seed users already exist; skipping employee seeding.");
    return;
  }

  const employeeSeeds = buildEmployees();
  const employeeValues = employeeSeeds.map((emp) => {
    const userId =
      emp.role === "manager"
        ? fallbackManagerId
        : emp.role === "admin"
          ? fallbackAdminId
          : fallbackAdminId;
    return {
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      position: emp.position,
      department: emp.department,
      userId,
    };
  });

  await db.insert(employees).values(employeeValues).onConflictDoNothing();

  console.log(`Seeded ${seededUsers.length} users and ${employeeValues.length} employees.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
