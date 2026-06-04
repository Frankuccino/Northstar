import type { InferInsertModel } from "drizzle-orm";
import { db } from "./index.js";
import { employees, users } from "./schema.js";
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
  const hashed = await bcrypt.hash("password123", 10);

  const insertedUsers = await db
    .insert(users)
    .values(
      usersToSeed.map(({ email, name, role }) => ({
        email,
        name,
        password: hashed,
        role,
      })),
    )
    .onConflictDoNothing()
    .returning();

  const seededUsers = insertedUsers;
  const emailToUserId = new Map(seededUsers.map((u: typeof users.$inferSelect) => [u.email, u.id]));
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
