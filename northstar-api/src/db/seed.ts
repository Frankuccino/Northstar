import "dotenv/config";
import { sql, type InferInsertModel } from "drizzle-orm";
import { db } from "./index.js";
import { employees, users } from "./schema.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

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
};

const usersToSeed: SeedUser[] = [
  {
    email: "admin@example.com",
    name: "System Admin",
    password: "password123",
    role: "admin",
  },
  {
    email: "manager@example.com",
    name: "Ops Manager",
    password: "password123",
    role: "manager",
  },
  {
    email: "ceo.user@example.com",
    name: "Chief Executive",
    password: "password123",
    role: "employee",
  },
  {
    email: "cto.user@example.com",
    name: "Chief Technology",
    password: "password123",
    role: "employee",
  },
  {
    email: "cmo.user@example.com",
    name: "Chief Marketing",
    password: "password123",
    role: "employee",
  },
  {
    email: "cfo.user@example.com",
    name: "Chief Finance",
    password: "password123",
    role: "employee",
  },
  {
    email: "coo.user@example.com",
    name: "Chief Operations",
    password: "password123",
    role: "employee",
  },
  {
    email: "ciso.user@example.com",
    name: "Chief Security",
    password: "password123",
    role: "employee",
  },
];

function buildEmployees(): SeedEmployee[] {
  const list: SeedEmployee[] = [
    {
      firstName: "Alexis",
      lastName: "Vance",
      email: "ceo.user@example.com",
      position: "CEO",
      department: "Executive",
    },
    {
      firstName: "Morgan",
      lastName: "Reeves",
      email: "cto.user@example.com",
      position: "CTO",
      department: "Engineering",
    },
    {
      firstName: "Jordan",
      lastName: "Park",
      email: "cmo.user@example.com",
      position: "CMO",
      department: "Marketing",
    },
    {
      firstName: "Riley",
      lastName: "Shaw",
      email: "cfo.user@example.com",
      position: "CFO",
      department: "Finance",
    },
    {
      firstName: "Taylor",
      lastName: "Nguyen",
      email: "coo.user@example.com",
      position: "COO",
      department: "Operations",
    },
    {
      firstName: "Casey",
      lastName: "Brooks",
      email: "ciso.user@example.com",
      position: "CISO",
      department: "Security",
    },
    {
      firstName: "Jamie",
      lastName: "Reyes",
      email: "jamie.reyes@example.com",
      position: "VP Engineering",
      department: "Engineering",
    },
    {
      firstName: "Drew",
      lastName: "Patel",
      email: "manager@example.com",
      position: "Engineering Manager",
      department: "Engineering",
    },
    {
      firstName: "Sam",
      lastName: "Kim",
      email: "sam.kim@example.com",
      position: "Senior Engineer",
      department: "Engineering",
    },
    {
      firstName: "Robin",
      lastName: "Costa",
      email: "robin.costa@example.com",
      position: "Engineer",
      department: "Engineering",
    },
    {
      firstName: "Avery",
      lastName: "Lopez",
      email: "avery.lopez@example.com",
      position: "QA Lead",
      department: "Engineering",
    },
    {
      firstName: "Blake",
      lastName: "Ahmed",
      email: "blake.ahmed@example.com",
      position: "Product Manager",
      department: "Product",
    },
    {
      firstName: "Charlie",
      lastName: "Müller",
      email: "charlie.muller@example.com",
      position: "Designer",
      department: "Product",
    },
    {
      firstName: "Dakota",
      lastName: "Silva",
      email: "dakota.silva@example.com",
      position: "Marketing Lead",
      department: "Marketing",
    },
    {
      firstName: "Emerson",
      lastName: "Johal",
      email: "emerson.johal@example.com",
      position: "Content Strategist",
      department: "Marketing",
    },
    {
      firstName: "Finley",
      lastName: "Ortiz",
      email: "finley.ortiz@example.com",
      position: "Accountant",
      department: "Finance",
    },
    {
      firstName: "Harper",
      lastName: "Dupont",
      email: "harper.dupont@example.com",
      position: "Operations Lead",
      department: "Operations",
    },
    {
      firstName: "Kai",
      lastName: "Ivanova",
      email: "kai.ivanova@example.com",
      position: "Security Analyst",
      department: "Security",
    },
    {
      firstName: "Logan",
      lastName: "Fernandez",
      email: "logan.fernandez@example.com",
      position: "HR Business Partner",
      department: "HR",
    },
    {
      firstName: "Mackenzie",
      lastName: "Stone",
      email: "mackenzie.stone@example.com",
      position: "Recruiter",
      department: "HR",
    },
  ];

  return list;
}

async function seed() {
  console.log("🗑️ Clearing existing database tables...");

  // 1. Delete dependent child data first to prevent foreign key constraint errors
  await db.delete(employees);
  await db.delete(users);

  // 2. Optional: Reset the auto-incrementing serial IDs back to 1
  // Drizzle requires raw SQL for sequence resetting because it varies by database engine
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1;`);
  await db.execute(sql`ALTER SEQUENCE employees_id_seq RESTART WITH 1;`);

  const pepper = process.env.PASSWORD_PEPPER;
  if (!pepper) {
    throw new Error("Server configuration error: Pepper missing for seeding.");
  }

  console.log("🌱 Database wiped. Starting fresh unique salting...");

  // 3. Run bcrypt independently for every user inside a Promise.all block
  const usersWithUniqueHashes = await Promise.all(
    usersToSeed.map(async (user) => {
      const preHashedInput = crypto
        .createHmac("sha256", pepper)
        .update("password123")
        .digest();

      const hashedPassword = await bcrypt.hash(preHashedInput, 10); // Generates a fresh salt every loop iteration
      return {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
      };
    }),
  );

  // 4. Insert the uniquely salted payloads into the database
  const insertedUsers = await db
    .insert(users)
    .values(usersWithUniqueHashes)
    .onConflictDoNothing()
    .returning();

  const seededUsers = insertedUsers;
  const emailToUserId = new Map(
    seededUsers.map((u: typeof users.$inferSelect) => [u.email, u.id]),
  );
  const fallbackUserId = seededUsers[0]?.id ?? null;

  if (!fallbackUserId) {
    console.log("Seed users already exist; skipping employee seeding.");
    return;
  }

  const employeeSeeds = buildEmployees();
  const employeeValues = employeeSeeds.map((emp) => {
    const userId = emailToUserId.get(emp.email) ?? fallbackUserId;

    const employeePayload: InferInsertModel<typeof employees> = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      position: emp.position,
      department: emp.department,
      userId,
    };

    return employeePayload;
  });

  await db.insert(employees).values(employeeValues).onConflictDoNothing();

  const allEmployees = await db.select().from(employees);
  const linkedEmployeesCount = allEmployees.filter(
    (e) => e.userId !== null,
  ).length;

  if (linkedEmployeesCount !== allEmployees.length) {
    throw new Error(
      `Seed data is inconsistent: expected ${allEmployees.length} linked employees, found ${linkedEmployeesCount}`,
    );
  }

  console.log(
    `Seeded ${seededUsers.length} users and ${allEmployees.length} employees.`,
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
