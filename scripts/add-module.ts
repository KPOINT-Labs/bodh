import { prisma } from "../lib/prisma";

async function main() {
  const courseId = "BSCCS1001";

  // Create TaskGraph entries for the course
  const taskGraphs = [
    { type: "QnA", graphId: "a71268a9-c6b1-4fba-97f2-049bceb92460" },
    { type: "FA", graphId: "01439a80-4be7-4dd2-93e3-47c428df2b07" },
  ];

  for (const tg of taskGraphs) {
    const created = await prisma.taskGraph.create({
      data: {
        courseId,
        type: tg.type,
        graphId: tg.graphId,
      },
    });

    console.log(`Created TaskGraph: ${tg.type} -> ${tg.graphId}`);
    console.log(`  ID: ${created.id}\n`);
  }

  // Verify
  const allTaskGraphs = await prisma.taskGraph.findMany({
    where: { courseId },
  });

  console.log("All TaskGraphs for course BSCCS1001:");
  allTaskGraphs.forEach((tg) => {
    console.log(`  ${tg.type}: ${tg.graphId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
