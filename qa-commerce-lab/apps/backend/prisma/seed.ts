import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.user.createMany({
    data: [
      {
        name: "QA Customer",
        email: "qa.customer@example.com",
        passwordHash,
        role: Role.CUSTOMER,
      },
      {
        name: "QA Admin",
        email: "qa.admin@example.com",
        passwordHash,
        role: Role.ADMIN,
      },
    ],
  });

  await prisma.product.createMany({
    data: [
      {
        name: "Mechanical Keyboard",
        description: "RGB keyboard with hot-swappable switches.",
        category: "Peripherals",
        priceInCents: 45990,
        stock: 8,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Ultrawide Monitor",
        description: "34-inch monitor built for deep work sessions.",
        category: "Monitors",
        priceInCents: 189990,
        stock: 4,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "Noise Cancelling Headset",
        description: "Wireless headset with long battery life.",
        category: "Audio",
        priceInCents: 79990,
        stock: 12,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
      },
      {
        name: "USB-C Dock",
        description: "Compact dock for multi-device setups.",
        category: "Accessories",
        priceInCents: 64990,
        stock: 6,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1580894908361-967195033215?auto=format&fit=crop&w=1200&q=80",
      }
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
