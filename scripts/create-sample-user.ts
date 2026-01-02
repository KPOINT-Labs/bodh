import { prisma } from "../lib/prisma";

async function createSampleUser() {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: "learner@bodh.app" },
  });

  if (existingUser) {
    console.log("Sample user already exists:");
    console.log("  ID:", existingUser.id);
    console.log("  Email:", existingUser.email);
    console.log("  Name:", existingUser.name);
    return existingUser;
  }

  // Create sample user
  const user = await prisma.user.create({
    data: {
      email: "learner@bodh.app",
      name: "Sample Learner",
      passwordHash: "placeholder-will-be-replaced-with-auth",
    },
  });

  console.log("Sample user created:");
  console.log("  ID:", user.id);
  console.log("  Email:", user.email);
  console.log("  Name:", user.name);

  return user;
}

createSampleUser()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
