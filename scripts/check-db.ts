import { prisma } from "../lib/prisma";

async function main() {
  try {
    console.log("Connecting to DB...");
    const count = await prisma.course.count();
    console.log(`Successfully connected. Found ${count} courses.`);
  } catch (e) {
    console.error("Error connecting to DB:", e);
  }
}

main();
