import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const STARTER_CATEGORIES: { name: string; products: string[] }[] = [
  {
    name: "VAPES\nALIBARBAR",
    products: [
      "Blueberry Blast",
      "Banana Buzz",
      "Blackberry Ice",
      "Cali Sunset",
      "Chupa Chups Strawberry",
      "FTP",
      "Grape Ice",
      "Kiwi Pineapple",
      "Mango Magic",
      "Pass Mango Lime",
      "Peach Ice",
      "Quad Berry",
      "S/berry Co W/melon",
      "S/berry Kiwi",
      "S/berry Lychee",
      "S/berry W/melon",
      "Skittles",
      "W/melon Ice",
      "Yellow Starburst",
    ],
  },
  {
    name: "CARTONS",
    products: [
      "Double Happy",
      "Esse Lights",
      "Mac Cool Blast",
      "Man Lights",
      "Man Reserve",
      "Man S Blue",
      "Man SE",
      "Marl Gold",
      "Marl Red",
      "Man Res Red",
    ],
  },
  {
    name: "SINGLES",
    products: [
      "Double Happy",
      "Esse Lights",
      "Mac Cool Blast",
      "Man Lights",
      "Man S Blue",
      "Man SE",
      "Marl Gold",
      "Marl Red",
      "Man Res Red",
    ],
  },
  {
    name: "CHOP CHOP",
    products: ["Chop Chop"],
  },
  {
    name: "ZYNS",
    products: ["Cola Ice", "Cool Tropical", "Pineapple Coconut"],
  },
];

async function seedAdminUser() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    console.log("SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD not set — skipping user seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { username: username.toLowerCase() },
    update: { passwordHash },
    create: { username: username.toLowerCase(), passwordHash },
  });
  console.log(`Seeded user "${user.username}".`);
}

async function seedStarterCatalog() {
  const existingCount = await prisma.category.count();
  if (existingCount > 0) {
    console.log("Categories already exist — skipping starter catalog seed.");
    return;
  }

  for (let i = 0; i < STARTER_CATEGORIES.length; i++) {
    const { name, products } = STARTER_CATEGORIES[i]!;
    const category = await prisma.category.create({
      data: { name, sortOrder: i },
    });
    await prisma.product.createMany({
      data: products.map((productName, j) => ({
        categoryId: category.id,
        name: productName,
        stockCount: 0,
        sortOrder: j,
      })),
    });
  }
  console.log("Seeded starter categories and products (stock counts start at 0).");
}

async function main() {
  await seedAdminUser();
  await seedStarterCatalog();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
