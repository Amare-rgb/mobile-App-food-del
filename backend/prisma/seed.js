const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─────────────────────────────────────────────
  // 1. Clean existing data (children first)
  // ─────────────────────────────────────────────
  console.log("🧹 Clearing old data...");
  await prisma.locationHistory.deleteMany();
  await prisma.courierLocation.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log("   ✓ Cleared\n");

  // ─────────────────────────────────────────────
  // 2. Hash passwords
  // ─────────────────────────────────────────────
  const defaultPassword = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("Amare@123", 10);
  const customerPassword = await bcrypt.hash("john123", 10);

  // ─────────────────────────────────────────────
  // 3. Users
  // ─────────────────────────────────────────────
  console.log("👤 Creating users...");

  const admin = await prisma.user.create({
    data: {
      name: "Amare Mesele",
      email: "amaremesele2@gmail.com",
      password: adminPassword,
      phone: "+251912345678",
      role: "admin",
    },
  });
  console.log(`   ✓ Admin:    ${admin.email}`);

  const customer1 = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@example.com",
      password: customerPassword,
      phone: "+251911111111",
      role: "customer",
      fcmToken: "ExponentPushToken[demo-customer-1]",
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: "Bob Customer",
      email: "bob@example.com",
      password: defaultPassword,
      phone: "+251913333333",
      role: "customer",
      fcmToken: "ExponentPushToken[demo-customer-2]",
    },
  });
  console.log(`   ✓ Customers: ${customer1.email}, ${customer2.email}`);

  const courier1 = await prisma.user.create({
    data: {
      name: "Charlie Courier",
      email: "charlie@example.com",
      password: defaultPassword,
      phone: "+251922222222",
      role: "courier",
      fcmToken: "ExponentPushToken[demo-courier-1]",
    },
  });

  const courier2 = await prisma.user.create({
    data: {
      name: "Dana Courier",
      email: "dana@example.com",
      password: defaultPassword,
      phone: "+251924444444",
      role: "courier",
      fcmToken: "ExponentPushToken[demo-courier-2]",
    },
  });
  console.log(`   ✓ Couriers:  ${courier1.email}, ${courier2.email}`);
  console.log(`   ✓ Created 5 users\n`);

  // ─────────────────────────────────────────────
  // 4. Categories
  // ─────────────────────────────────────────────
  console.log("🍽️  Creating categories...");

  const burgersCat = await prisma.category.create({ data: { name: "Burgers", icon: "fast-food" } });
  const pizzaCat = await prisma.category.create({ data: { name: "Pizza", icon: "pizza" } });
  const sushiCat = await prisma.category.create({ data: { name: "Sushi", icon: "fish" } });
  const sidesCat = await prisma.category.create({ data: { name: "Sides", icon: "restaurant" } });
  const drinksCat = await prisma.category.create({ data: { name: "Drinks", icon: "cafe" } });
  const soupsCat = await prisma.category.create({ data: { name: "Soups", icon: "soup" } });

  console.log(`   ✓ Created 6 categories\n`);

  // ─────────────────────────────────────────────
  // 5. Menu Items
  // ─────────────────────────────────────────────
  console.log("🍔 Creating menu items...");

  const menuItems = [
    // Burgers
    {
      name: "Classic Burger",
      description: "Beef patty, lettuce, tomato, special sauce",
      price: 9.99,
      categoryId: burgersCat.id,
      image: "https://images.unsplash.com/photo-1550547660-d9450f859349",
      rating: 4.6,
      isPopular: true,
    },
    {
      name: "Cheese Burger",
      description: "Classic with melted cheddar",
      price: 10.99,
      categoryId: burgersCat.id,
      image: "https://images.unsplash.com/photo-1553979459-d2229ba7433b",
      rating: 4.7,
      isPopular: true,
    },
    // Pizza
    {
      name: "Margherita Pizza",
      description: "Tomato, mozzarella, basil",
      price: 12.99,
      categoryId: pizzaCat.id,
      image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002",
      rating: 4.8,
      isPopular: true,
    },
    {
      name: "Pepperoni Pizza",
      description: "Classic pepperoni and cheese",
      price: 14.99,
      categoryId: pizzaCat.id,
      image: "https://images.unsplash.com/photo-1628840042765-356cda07504e",
      rating: 4.9,
      isPopular: true,
    },
    // Sushi
    {
      name: "California Roll",
      description: "Crab, avocado, cucumber",
      price: 8.99,
      categoryId: sushiCat.id,
      image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351",
      rating: 4.5,
      isPopular: false,
    },
    {
      name: "Salmon Nigiri",
      description: "Fresh salmon over rice",
      price: 6.99,
      categoryId: sushiCat.id,
      rating: 4.6,
      isPopular: false,
    },
    // Sides
    {
      name: "Cheese Fries",
      description: "Crispy fries with cheese sauce",
      price: 4.99,
      categoryId: sidesCat.id,
      rating: 4.4,
      isPopular: false,
    },
    {
      name: "Onion Rings",
      description: "Golden fried onion rings",
      price: 4.49,
      categoryId: sidesCat.id,
      rating: 4.3,
      isPopular: false,
    },
    {
      name: "Garlic Bread",
      description: "Toasted with garlic butter",
      price: 4.99,
      categoryId: sidesCat.id,
      rating: 4.5,
      isPopular: false,
    },
    // Drinks
    {
      name: "Milkshake",
      description: "Vanilla, chocolate, or strawberry",
      price: 5.49,
      categoryId: drinksCat.id,
      rating: 4.7,
      isPopular: false,
    },
    {
      name: "Coke",
      description: "330ml can",
      price: 1.99,
      categoryId: drinksCat.id,
      rating: 4.2,
      isPopular: false,
    },
    // Soups
    {
      name: "Miso Soup",
      description: "Traditional Japanese soup",
      price: 3.49,
      categoryId: soupsCat.id,
      rating: 4.4,
      isPopular: false,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log(`   ✓ Created ${menuItems.length} menu items\n`);

  // ─────────────────────────────────────────────
  // 6. Orders
  // ─────────────────────────────────────────────
  console.log("📦 Creating orders...");

  await prisma.order.create({
    data: {
      customerId: customer1.id,
      courierId: courier1.id,
      status: "approved", // ✅ fixed old status
      totalAmount: 25.47,
      deliveryLat: 37.775,
      deliveryLng: -122.418,
      deliveryAddr: "123 Main St, San Francisco, CA",
      items: [
        { name: "Classic Burger", quantity: 2, price: 9.99 },
        { name: "Cheese Fries", quantity: 1, price: 4.99 },
      ],
    },
  });

  await prisma.order.create({
    data: {
      customerId: customer2.id,
      courierId: courier2.id,
      status: "approved", // ✅ fixed old status
      totalAmount: 32.97,
      deliveryLat: 37.78,
      deliveryLng: -122.41,
      deliveryAddr: "456 Oak Ave, San Francisco, CA",
      items: [
        { name: "Pepperoni Pizza", quantity: 2, price: 14.99 },
        { name: "Garlic Bread", quantity: 1, price: 4.99 },
      ],
    },
  });

  await prisma.order.create({
    data: {
      customerId: customer1.id,
      status: "pending",
      totalAmount: 19.47,
      deliveryLat: 37.77,
      deliveryLng: -122.42,
      deliveryAddr: "789 Pine Rd, San Francisco, CA",
      items: [
        { name: "California Roll", quantity: 2, price: 8.99 },
        { name: "Miso Soup", quantity: 1, price: 3.49 },
      ],
    },
  });

  await prisma.order.create({
    data: {
      customerId: customer2.id,
      courierId: courier1.id,
      status: "pending", // ✅ fixed old status
      totalAmount: 16.48,
      deliveryLat: 37.782,
      deliveryLng: -122.413,
      deliveryAddr: "321 Elm St, San Francisco, CA",
      items: [
        { name: "Cheese Burger", quantity: 1, price: 10.99 },
        { name: "Milkshake", quantity: 1, price: 5.49 },
      ],
    },
  });

  console.log(`   ✓ Created 4 orders\n`);

  // ─────────────────────────────────────────────
  // 7. Courier locations
  // ─────────────────────────────────────────────
  console.log("📍 Creating courier locations...");

  await prisma.courierLocation.create({
    data: {
      courierId: courier1.id,
      lat: 37.776,
      lng: -122.417,
      heading: 45,
    },
  });

  await prisma.courierLocation.create({
    data: {
      courierId: courier2.id,
      lat: 37.781,
      lng: -122.411,
      heading: 180,
    },
  });

  console.log(`   ✓ Created 2 courier locations\n`);

  // ─────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("✅ Seed completed successfully!");
  console.log("═══════════════════════════════════════════\n");
  console.log("📋 Test accounts:\n");
  console.log("   👑 ADMIN     → amaremesele2@gmail.com  / Amare@123");
  console.log("   👤 CUSTOMER  → john@example.com        / john123");
  console.log("   👤 CUSTOMER  → bob@example.com         / password123");
  console.log("   🛵 COURIER   → charlie@example.com     / password123");
  console.log("   🛵 COURIER   → dana@example.com        / password123\n");
  console.log(`🍽️  Categories: 6`);
  console.log(`🍔 Menu items: ${menuItems.length}`);
  console.log("📦 Orders: 4 (pending, approved)");
  console.log("📍 Courier locations: 2\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });