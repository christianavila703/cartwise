import { OptionSetType, PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/shared/lib/password";

// Resets the catalog (categories, brands, specs, options, products) and upserts the admin user.
// Users and their accounts are never deleted.

const db = new PrismaClient();

type TCategorySeed = {
  key: string;
  name: string;
  url: string;
  iconUrl?: string;
  iconSize?: [number, number];
  children?: TCategorySeed[];
};

const CATEGORIES: TCategorySeed[] = [
  {
    key: "pc-laptops",
    name: "Computers & Laptops",
    url: "pc-laptops",
    iconUrl: "computerIcon",
    iconSize: [17, 15],
    children: [
      {
        key: "computer",
        name: "Computers",
        url: "computer",
        children: [
          { key: "computer-apple", name: "Apple", url: "apple" },
          { key: "computer-accessories", name: "Accessories", url: "accessories" },
        ],
      },
      {
        key: "laptops",
        name: "Laptops",
        url: "laptops",
        children: [
          { key: "laptops-asus", name: "ASUS", url: "asus" },
          { key: "laptops-microsoft", name: "Microsoft", url: "microsoft" },
        ],
      },
    ],
  },
  {
    key: "smartphones",
    name: "Smartphones",
    url: "smartphones",
    iconUrl: "phoneIcon",
    iconSize: [12, 18],
    children: [
      { key: "apple-iphone", name: "Apple iPhone", url: "apple-iphone" },
      { key: "samsung-galaxy", name: "Samsung Galaxy", url: "samsung-galaxy" },
      { key: "google-pixel", name: "Google Pixel", url: "google-pixel" },
      { key: "xiaomi", name: "Xiaomi", url: "xiaomi" },
    ],
  },
  {
    key: "tablets",
    name: "Tablets",
    url: "tablets",
    iconUrl: "tabletIcon",
    iconSize: [20, 16],
    children: [
      { key: "tablets-apple", name: "Apple iPad", url: "apple" },
      { key: "tablets-samsung", name: "Samsung Tablets", url: "samsung" },
    ],
  },
  {
    key: "watches",
    name: "Watches",
    url: "watches",
    iconUrl: "watchIcon",
    iconSize: [12, 18],
    children: [
      { key: "watches-apple", name: "Apple Watch", url: "apple" },
      { key: "watches-samsung", name: "Samsung Watch", url: "samsung" },
    ],
  },
  {
    key: "tvs",
    name: "TVs",
    url: "tvs",
    iconUrl: "tvIcon",
    iconSize: [17, 13],
    children: [{ key: "tvs-smart", name: "Smart TVs", url: "smart-tvs" }],
  },
  {
    key: "video-games",
    name: "Video Games",
    url: "video-games",
    iconUrl: "gameIcon",
    iconSize: [18, 11],
    children: [
      { key: "consoles", name: "Consoles", url: "consoles" },
      { key: "controllers", name: "Controllers", url: "controllers" },
    ],
  },
  {
    key: "photography",
    name: "Photography",
    url: "photography",
    iconUrl: "cameraIcon",
    iconSize: [18, 14],
    children: [
      {
        key: "cameras",
        name: "Cameras",
        url: "cameras",
        children: [
          { key: "cameras-sony", name: "Sony", url: "sony" },
          { key: "cameras-canon", name: "Canon", url: "canon" },
          { key: "cameras-lenses", name: "Lenses", url: "lenses" },
        ],
      },
      { key: "drones", name: "Drones", url: "drones" },
      {
        key: "scanners",
        name: "Scanners",
        url: "scanners",
        children: [{ key: "scanners-epson", name: "Epson", url: "epson" }],
      },
    ],
  },
  {
    key: "audio",
    name: "Audio",
    url: "audio",
    iconUrl: "musicIcon",
    iconSize: [16, 16],
    children: [
      {
        key: "headphones",
        name: "Headphones",
        url: "headphones",
        children: [{ key: "headphones-apple", name: "Apple", url: "apple" }],
      },
    ],
  },
];

const BRANDS = ["Apple", "Samsung", "Google", "Xiaomi", "ASUS", "Microsoft", "Sony", "Canon", "Wacom", "Epson", "DJI"];

const SPEC_GROUPS = {
  general: { title: "General", specs: ["Brand", "Model", "Color"] },
  display: { title: "Display", specs: ["Screen Size", "Resolution", "Panel Type"] },
  performance: { title: "Performance", specs: ["Processor", "Memory", "Storage"] },
  audio: { title: "Audio", specs: ["Connectivity", "Noise Cancelling", "Battery Life"] },
  camera: { title: "Camera", specs: ["Sensor", "Resolution", "Lens Mount"] },
  gaming: { title: "Gaming", specs: ["Platform", "Connectivity", "Battery Life"] },
} as const;

type TSpecGroupKey = keyof typeof SPEC_GROUPS;

// spec groups attached to each top-level category (sub categories inherit them)
const CATEGORY_SPEC_GROUPS: Record<string, TSpecGroupKey[]> = {
  "pc-laptops": ["general", "display", "performance"],
  smartphones: ["general", "display", "performance"],
  tablets: ["general", "display", "performance"],
  watches: ["general", "display"],
  tvs: ["general", "display"],
  "video-games": ["general", "gaming"],
  photography: ["general", "camera"],
  audio: ["general", "audio"],
};

const productImages = (prefix: string, names: string[]) => names.map((name) => `/images/products/${prefix}${name}`);

type TProductSeed = {
  id?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  salePrice?: number;
  isAvailable?: boolean;
  desc: string;
  specialFeatures: [string, string, string];
  images: string[];
  specs: Partial<Record<TSpecGroupKey, string[]>>;
};

// products with an id are linked from the homepage constants, so their ids must stay fixed
const PRODUCTS: TProductSeed[] = [
  {
    id: "65e6ef559d4ab819d1158194",
    name: "Apple AirPods Max",
    category: "headphones-apple",
    brand: "Apple",
    price: 579,
    salePrice: 519,
    desc: "Over-ear headphones with high-fidelity audio, Active Noise Cancellation and spatial audio.",
    specialFeatures: ["Wireless", "Noise Cancelling", "Built-In Microphone"],
    images: productImages("", ["airpodsMax1.jpg", "airpodsMax2.jpg", "airpodsMax3.jpg", "airpodsMax4.jpg"]),
    specs: {
      general: ["Apple", "AirPods Max", "Space Gray"],
      audio: ["Bluetooth 5.0", "Active", "20 hours"],
    },
  },
  {
    id: "65e6eed69d4ab819d1158193",
    name: "Apple AirPods Pro (3rd generation)",
    category: "headphones-apple",
    brand: "Apple",
    price: 129.99,
    desc: "In-ear wireless earbuds with Active Noise Cancellation, Transparency mode and a MagSafe charging case.",
    specialFeatures: ["Built-In Microphone", "3rd generation", "Water Resistant"],
    images: productImages("", ["airpods1.jpg", "airpods2.jpg", "airpods3.jpg", "airpods4.jpg", "airpods5.jpg"]),
    specs: {
      general: ["Apple", "AirPods Pro", "White"],
      audio: ["Bluetooth 5.3", "Active", "6 hours (30 with case)"],
    },
  },
  {
    id: "65e6f3fd9d4ab819d1158197",
    name: "Apple Magic Mouse",
    category: "computer-accessories",
    brand: "Apple",
    price: 79.99,
    salePrice: 55.49,
    desc: "Wireless, rechargeable mouse with a Multi-Touch surface for gestures.",
    specialFeatures: ["Bluetooth", "White", "Rechargeable"],
    images: productImages("", ["appleMouse1.jpg", "appleMouse2.jpg", "appleMouse3.jpg", "appleMouse4.jpg"]),
    specs: {
      general: ["Apple", "Magic Mouse", "White"],
      display: ["-", "-", "-"],
      performance: ["-", "-", "-"],
    },
  },
  {
    id: "65e22d7f580cd983d5aa5a2f",
    name: "Apple iMac 24-inch (M3)",
    category: "computer-apple",
    brand: "Apple",
    price: 1299,
    salePrice: 1119,
    desc: "All-in-one desktop with the M3 chip and a 4.5K Retina display in a strikingly thin design.",
    specialFeatures: ["8GB Memory", "256GB", "M3 chip"],
    images: productImages("", ["imac2_1.jpg", "imac2_2.jpg", "imac2_3.jpg", "imac2_4.jpg"]),
    specs: {
      general: ["Apple", "iMac 24-inch", "Blue"],
      display: ["24 inch", "4480 x 2520", "Retina"],
      performance: ["Apple M3", "8GB", "256GB SSD"],
    },
  },
  {
    name: "Apple iMac 24-inch (M3, 8-core GPU)",
    category: "computer-apple",
    brand: "Apple",
    price: 1499,
    desc: "iMac with the M3 chip, 8-core GPU, two Thunderbolt ports and a color-matched Magic Keyboard.",
    specialFeatures: ["16GB Memory", "512GB", "M3 chip"],
    images: productImages("", ["imac1.jpg", "imac2.jpg", "imac3.jpg", "imac4.jpg"]),
    specs: {
      general: ["Apple", "iMac 24-inch", "Silver"],
      display: ["24 inch", "4480 x 2520", "Retina"],
      performance: ["Apple M3", "16GB", "512GB SSD"],
    },
  },
  {
    id: "65e6008bcb99bb936d4cb7ac",
    name: "ASUS ROG Strix SCAR 17",
    category: "laptops-asus",
    brand: "ASUS",
    price: 2499.99,
    salePrice: 2149.99,
    desc: "17-inch gaming laptop with a high refresh rate display and desktop-class performance.",
    specialFeatures: ["32GB RAM", "17inch display", "OLED Display"],
    images: productImages("", ["asusRog1.jpg", "asusRog2.jpg", "asusRog3.jpg", "asusRog4.jpg", "asusRog5.jpg"]),
    specs: {
      general: ["ASUS", "ROG Strix SCAR 17", "Black"],
      display: ["17.3 inch", "2560 x 1440", "OLED"],
      performance: ["Intel Core i9", "32GB", "1TB SSD"],
    },
  },
  {
    name: "ASUS Zenbook 14 OLED",
    category: "laptops-asus",
    brand: "ASUS",
    price: 1099,
    salePrice: 949,
    desc: "Thin and light 14-inch laptop with a vivid OLED display and all-day battery life.",
    specialFeatures: ["16GB RAM", "14inch display", "OLED Display"],
    images: productImages("", ["asusZen1.jpg", "asusZen2.jpg", "asusZen3.jpg", "asusZen4.jpg", "asusZen5.jpg"]),
    specs: {
      general: ["ASUS", "Zenbook 14 OLED", "Ponder Blue"],
      display: ["14 inch", "2880 x 1800", "OLED"],
      performance: ["Intel Core Ultra 7", "16GB", "1TB SSD"],
    },
  },
  {
    id: "65e6530ecb99bb936d4cb7db",
    name: "Apple iPhone 15 Pro Max",
    category: "apple-iphone",
    brand: "Apple",
    price: 1199.99,
    salePrice: 1059.99,
    desc: "Titanium design, A17 Pro chip and the most advanced iPhone camera system.",
    specialFeatures: ["256GB", "Blue Titanium", "A17 Pro chip"],
    images: productImages("", ["iphone1.jpg", "iphone2.jpg", "iphone3.jpg"]),
    specs: {
      general: ["Apple", "iPhone 15 Pro Max", "Blue Titanium"],
      display: ["6.7 inch", "2796 x 1290", "Super Retina XDR OLED"],
      performance: ["A17 Pro", "8GB", "256GB"],
    },
  },
  {
    name: "Samsung Galaxy S23",
    category: "samsung-galaxy",
    brand: "Samsung",
    price: 799.99,
    salePrice: 699.99,
    desc: "Compact flagship with a bright Dynamic AMOLED display and a pro-grade camera.",
    specialFeatures: ["128GB", "Phantom Black", "50MP Camera"],
    images: productImages("", ["samsungS23_1.jpg", "samsungS23_2.jpg", "samsungS23_3.jpg", "samsungS23_4.jpg"]),
    specs: {
      general: ["Samsung", "Galaxy S23", "Phantom Black"],
      display: ["6.1 inch", "2340 x 1080", "Dynamic AMOLED 2X"],
      performance: ["Snapdragon 8 Gen 2", "8GB", "128GB"],
    },
  },
  {
    id: "65e6244fcb99bb936d4cb7c0",
    name: "Apple iPad Pro 12.9-inch",
    category: "tablets-apple",
    brand: "Apple",
    price: 1149,
    salePrice: 1099,
    desc: "The ultimate iPad experience with the M2 chip and a Liquid Retina XDR display.",
    specialFeatures: ["Wi-Fi", "256GB", "12.9-Inch"],
    images: productImages("", [
      "ipadPro1.jpg",
      "ipadPro2.jpg",
      "ipadPro3.jpg",
      "ipadPro4.jpg",
      "ipadPro5.jpg",
      "ipadPro6.jpg",
      "ipadPro7.jpg",
      "ipadPro8.jpg",
    ]),
    specs: {
      general: ["Apple", "iPad Pro 12.9-inch", "Space Gray"],
      display: ["12.9 inch", "2732 x 2048", "Liquid Retina XDR"],
      performance: ["Apple M2", "8GB", "256GB"],
    },
  },
  {
    name: "Apple iPad Air",
    category: "tablets-apple",
    brand: "Apple",
    price: 599,
    desc: "Serious performance in a thin and light design with the M1 chip.",
    specialFeatures: ["Wi-Fi", "64GB", "10.9-Inch"],
    images: productImages("", ["ipadAir1.jpg", "ipadAir2.jpg", "ipadAir3.jpg"]),
    specs: {
      general: ["Apple", "iPad Air", "Starlight"],
      display: ["10.9 inch", "2360 x 1640", "Liquid Retina"],
      performance: ["Apple M1", "8GB", "64GB"],
    },
  },
  {
    id: "65e6f5339d4ab819d115819c",
    name: "Apple Watch Ultra 2",
    category: "watches-apple",
    brand: "Apple",
    price: 799,
    desc: "The most rugged and capable Apple Watch, with a 49mm titanium case and precision dual-frequency GPS.",
    specialFeatures: ["GPS + Cellular", "Titanium", "49mm"],
    images: productImages("", [
      "appleWatch1.jpg",
      "appleWatch2.jpg",
      "appleWatch3.jpg",
      "appleWatch4.jpg",
      "appleWatch5.jpg",
    ]),
    specs: {
      general: ["Apple", "Watch Ultra 2", "Natural Titanium"],
      display: ["49 mm", "502 x 410", "Always-On Retina"],
    },
  },
  {
    id: "65e6f80a9d4ab819d11581a2",
    name: "Sony PlayStation 5",
    category: "consoles",
    brand: "Sony",
    price: 499.99,
    salePrice: 449.99,
    desc: "Lightning-fast loading with an ultra-high speed SSD, haptic feedback and 4K gaming.",
    specialFeatures: ["825GB SSD", "4K Gaming", "Ray Tracing"],
    images: productImages("", ["PS5.jpg", "PS5_2.jpg", "PS5_3.jpg"]),
    specs: {
      general: ["Sony", "PlayStation 5", "White"],
      gaming: ["PlayStation 5", "Wi-Fi 6, Bluetooth 5.1", "-"],
    },
  },
  {
    id: "65e6f5f89d4ab819d115819f",
    name: "Sony DualSense Wireless Controller",
    category: "controllers",
    brand: "Sony",
    price: 69,
    desc: "Wireless controller with haptic feedback, adaptive triggers and a built-in microphone.",
    specialFeatures: ["Bluetooth", "Version 2", "Haptic Feedback"],
    images: productImages("", ["ps5Controller1.jpg", "ps5Controller2.jpg", "ps5Controller3.jpg", "ps5Controller4.jpg"]),
    specs: {
      general: ["Sony", "DualSense", "White"],
      gaming: ["PlayStation 5", "Bluetooth, USB-C", "6 hours"],
    },
  },
  {
    id: "65e656decb99bb936d4cb7e4",
    name: "Sony Alpha 7R V",
    category: "cameras-sony",
    brand: "Sony",
    price: 4499,
    salePrice: 3699,
    desc: "61MP full-frame mirrorless camera with AI-based autofocus and 8-stop image stabilization.",
    specialFeatures: ["Full Frame", "Body", "61MP"],
    images: productImages("", [
      "sonyAlpha7_1.jpg",
      "sonyAlpha7_2.jpg",
      "sonyAlpha7_3.jpg",
      "sonyAlpha7_4.jpg",
      "sonyAlpha7_5.jpg",
      "sonyAlpha7_6.jpg",
      "sonyAlpha7_7.jpg",
      "sonyAlpha7_8.jpg",
      "sonyAlpha7_9.jpg",
    ]),
    specs: {
      general: ["Sony", "Alpha 7R V", "Black"],
      camera: ["Full-frame Exmor R CMOS", "61MP", "Sony E-mount"],
    },
  },
  {
    name: "Canon EOS R6 Mark II",
    category: "cameras-canon",
    brand: "Canon",
    price: 2499,
    isAvailable: false,
    desc: "Full-frame mirrorless camera built for hybrid photo and video shooters.",
    specialFeatures: ["Full Frame", "Body", "24MP"],
    images: productImages("", ["canon1.jpg", "canon2.jpg"]),
    specs: {
      general: ["Canon", "EOS R6 Mark II", "Black"],
      camera: ["Full-frame CMOS", "24.2MP", "Canon RF"],
    },
  },
  {
    id: "65e6f7469d4ab819d11581a1",
    name: "Wacom Cintiq Pro 27",
    category: "computer-accessories",
    brand: "Wacom",
    price: 3499.95,
    desc: "27-inch 4K pen display with Pro Pen 3 for professional creatives and designers.",
    specialFeatures: ["4K Display", "Pro Pen 3", "Touch"],
    images: ["/images/images/wacom.jpg"],
    specs: {
      general: ["Wacom", "Cintiq Pro 27", "Black"],
      display: ["27 inch", "3840 x 2160", "IPS"],
      performance: ["-", "-", "-"],
    },
  },
];

const OPTION_SETS = [
  {
    name: "Color",
    type: OptionSetType.COLOR,
    options: [
      { name: "Black", value: "#000000" },
      { name: "White", value: "#ffffff" },
      { name: "Blue", value: "#1e5bb8" },
    ],
    categories: ["smartphones", "tablets"],
  },
  {
    name: "Storage",
    type: OptionSetType.TEXT,
    options: [
      { name: "128GB", value: "128GB" },
      { name: "256GB", value: "256GB" },
      { name: "512GB", value: "512GB" },
    ],
    categories: ["smartphones", "tablets"],
  },
];

async function clearCatalog() {
  await db.category_OptionSet.deleteMany();
  await db.category_SpecGroup.deleteMany();
  await db.product.deleteMany();
  await db.optionSet.deleteMany();
  await db.specGroup.deleteMany();
  await db.category.deleteMany();
  await db.brand.deleteMany();
}

async function seedCategories(nodes: TCategorySeed[], parentID: string | null, ids: Map<string, string>) {
  for (const node of nodes) {
    const category = await db.category.create({
      data: {
        parentID,
        name: node.name,
        url: node.url,
        iconUrl: node.iconUrl ?? null,
        iconSize: node.iconSize ?? [],
      },
    });
    ids.set(node.key, category.id);
    if (node.children) await seedCategories(node.children, category.id, ids);
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin user");
    return;
  }

  const hashedPassword = await hashPassword(password);
  await db.user.upsert({
    where: { email },
    update: { hashedPassword },
    create: { email, name: "Admin", hashedPassword },
  });
  console.log(`Admin user ready: ${email}`);
}

async function main() {
  await clearCatalog();

  const categoryIDs = new Map<string, string>();
  await seedCategories(CATEGORIES, null, categoryIDs);

  const brandIDs = new Map<string, string>();
  for (const name of BRANDS) {
    const brand = await db.brand.create({ data: { name } });
    brandIDs.set(name, brand.id);
  }

  const specGroupIDs = new Map<TSpecGroupKey, string>();
  for (const [key, group] of Object.entries(SPEC_GROUPS) as [TSpecGroupKey, (typeof SPEC_GROUPS)[TSpecGroupKey]][]) {
    const specGroup = await db.specGroup.create({ data: { title: group.title, specs: [...group.specs] } });
    specGroupIDs.set(key, specGroup.id);
  }

  await db.category_SpecGroup.createMany({
    data: Object.entries(CATEGORY_SPEC_GROUPS).flatMap(([categoryKey, groupKeys]) =>
      groupKeys.map((groupKey) => ({
        categoryID: categoryIDs.get(categoryKey)!,
        specGroupID: specGroupIDs.get(groupKey)!,
      }))
    ),
  });

  for (const { categories, ...optionSet } of OPTION_SETS) {
    const created = await db.optionSet.create({ data: optionSet });
    await db.category_OptionSet.createMany({
      data: categories.map((categoryKey) => ({ categoryID: categoryIDs.get(categoryKey)!, optionID: created.id })),
    });
  }

  for (const product of PRODUCTS) {
    const categoryID = categoryIDs.get(product.category);
    const brandID = brandIDs.get(product.brand);
    if (!categoryID || !brandID) throw new Error(`Unknown category or brand for ${product.name}`);

    await db.product.create({
      data: {
        ...(product.id ? { id: product.id } : {}),
        name: product.name,
        desc: product.desc,
        price: product.price,
        salePrice: product.salePrice ?? null,
        isAvailable: product.isAvailable ?? true,
        specialFeatures: product.specialFeatures,
        images: product.images,
        optionSets: [],
        categoryID,
        brandID,
        specs: (Object.entries(product.specs) as [TSpecGroupKey, string[]][]).map(([groupKey, specValues]) => ({
          specGroupID: specGroupIDs.get(groupKey)!,
          specValues,
        })),
      },
    });
  }

  await seedAdmin();

  console.log(
    `Seeded ${categoryIDs.size} categories, ${brandIDs.size} brands, ${specGroupIDs.size} spec groups, ${OPTION_SETS.length} option sets and ${PRODUCTS.length} products`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
