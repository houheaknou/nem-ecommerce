/**
 * DEVELOPMENT SEED — DEMO DATA ONLY.
 * Every customer/order/batch created here is fictional. Prices are the sample
 * prices from the spec and are meant to be edited in the admin UI.
 * Idempotent: safe to run more than once.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "../src/features/auth/permissions";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

async function seedRbac() {
  for (const [code, label] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { code }, update: { label }, create: { code, label } });
  }
  const perms = await db.permission.findMany();
  const byCode = new Map(perms.map((p) => [p.code, p.id]));
  for (const [code, name] of Object.entries(ROLES)) {
    const role = await db.role.upsert({
      where: { code },
      update: { nameKm: name.km, nameEn: name.en },
      create: { code, nameKm: name.km, nameEn: name.en },
    });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.rolePermission.createMany({
      data: ROLE_PERMISSIONS[code as keyof typeof ROLES].map((p) => ({ roleId: role.id, permissionId: byCode.get(p)! })),
    });
  }
}

async function seedUser(email: string, name: string, password: string, roleCode: string) {
  const role = await db.role.findUniqueOrThrow({ where: { code: roleCode } });
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash: await bcrypt.hash(password, 10) },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id },
  });
  return user;
}

async function seedLocations() {
  // Subset of Cambodian provinces (full gazetteer can be imported later).
  const provinces = [
    ["12", "ភ្នំពេញ", "Phnom Penh"],
    ["02", "បាត់ដំបង", "Battambang"],
    ["17", "សៀមរាប", "Siem Reap"],
    ["01", "បន្ទាយមានជ័យ", "Banteay Meanchey"],
    ["15", "ពោធិ៍សាត់", "Pursat"],
    ["08", "កណ្ដាល", "Kandal"],
    ["18", "ព្រះសីហនុ", "Preah Sihanouk"],
    ["03", "កំពង់ចាម", "Kampong Cham"],
  ] as const;
  for (const [code, km, en] of provinces) {
    await db.province.upsert({ where: { code }, update: {}, create: { code, nameKm: km, nameEn: en } });
  }
  const btb = await db.province.findUniqueOrThrow({ where: { code: "02" } });
  await db.district.upsert({
    where: { code: "0203" },
    update: {},
    create: { code: "0203", provinceId: btb.id, nameKm: "ក្រុងបាត់ដំបង", nameEn: "Battambang City" },
  });
}

async function seedDelivery() {
  if (await db.deliveryZone.count()) return;
  const own = await db.deliveryProvider.create({ data: { name: "Nem Battambang Rider", kind: "OWN", contact: "012 000 000" } });
  await db.deliveryProvider.create({ data: { name: "Express Courier (demo)", kind: "THIRD_PARTY" } });
  await db.driver.create({ data: { providerId: own.id, name: "Sok Dara (demo)", phone: "012 111 222" } });

  const provinces = await db.province.findMany();
  const pp = provinces.find((p) => p.code === "12")!;
  const btb = provinces.find((p) => p.code === "02")!;

  const local = await db.deliveryZone.create({
    data: { name: "Battambang (local)", areas: { create: [{ provinceId: btb.id }] } },
  });
  await db.deliveryRate.create({
    data: { zoneId: local.id, name: "Local by quantity", method: "QUANTITY", baseFee: 4000, includedQty: 10, qtyStep: 10, feePerQtyStep: 1000, freeThreshold: 100000, providerId: own.id },
  });

  const ppZone = await db.deliveryZone.create({
    data: { name: "Phnom Penh", areas: { create: [{ provinceId: pp.id }] } },
  });
  await db.deliveryRate.create({
    data: { zoneId: ppZone.id, name: "Phnom Penh by weight", method: "WEIGHT", baseFee: 6000, includedGrams: 1000, stepGrams: 1000, feePerWeightStep: 2000, maxWeightGrams: 30000 },
  });

  const rest = await db.deliveryZone.create({
    data: {
      name: "Other provinces",
      areas: { create: provinces.filter((p) => p.code !== "12" && p.code !== "02").map((p) => ({ provinceId: p.id })) },
    },
  });
  await db.deliveryRate.create({
    data: { zoneId: rest.id, name: "Provincial by quantity", method: "QUANTITY", baseFee: 6000, includedQty: 10, qtyStep: 10, feePerQtyStep: 2000 },
  });
}

async function seedCatalog() {
  const cat = await db.category.upsert({
    where: { slug: "nem" },
    update: {},
    create: { slug: "nem", nameKm: "ណែម", nameEn: "Nem", sortOrder: 1 },
  });
  await db.category.upsert({
    where: { slug: "sauces" },
    update: {},
    create: { slug: "sauces", nameKm: "ទឹកជ្រលក់", nameEn: "Sauces & Sides", sortOrder: 2 },
  });

  const loc = await db.inventoryLocation.upsert({
    where: { code: "BTB-MAIN" },
    update: {},
    create: { code: "BTB-MAIN", name: "Battambang kitchen", isDefault: true },
  });

  const product = await db.product.upsert({
    where: { slug: "nem-battambang" },
    update: {},
    create: {
      slug: "nem-battambang",
      nameKm: "ណែមបាត់ដំបង",
      nameEn: "Nem Battambang",
      descriptionKm: "ណែមបាត់ដំបងធ្វើដោយដៃ តាមរូបមន្តប្រពៃណី ជូរល្មម ឈ្ងុយឆ្ងាញ់។",
      descriptionEn: "Handmade Battambang-style fermented pork, traditional recipe, perfectly tangy.",
      categoryId: cat.id,
      isFeatured: true,
      shelfLifeDays: 10,
    },
  });

  const variants = [
    { sku: "NEM-S", nameKm: "កញ្ចប់តូច", nameEn: "Small Pack", packageSize: "10 pcs", units: 10, g: 250, pg: 20, retail: 5000, cost: 3000 },
    { sku: "NEM-M", nameKm: "កញ្ចប់មធ្យម", nameEn: "Medium Pack", packageSize: "20 pcs", units: 20, g: 500, pg: 30, retail: 9500, cost: 5800 },
    { sku: "NEM-L", nameKm: "កញ្ចប់ធំ", nameEn: "Large Pack", packageSize: "40 pcs", units: 40, g: 1000, pg: 50, retail: 18000, cost: 11200 },
    { sku: "NEM-SP", nameKm: "កញ្ចប់ពិសេស", nameEn: "Special Gift Pack", packageSize: "30 pcs + sauce", units: 30, g: 900, pg: 150, retail: 20000, cost: 12000 },
  ];
  for (const [i, v] of variants.entries()) {
    const variant = await db.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: {
        productId: product.id, sku: v.sku, nameKm: v.nameKm, nameEn: v.nameEn, packageSize: v.packageSize,
        unitsPerPackage: v.units, weightGrams: v.g, packagingGrams: v.pg, retailPrice: v.retail, costPrice: v.cost,
        minStock: 20, sortOrder: i,
      },
    });
    // Demo batches: one fresh, one near expiry.
    for (const [suffix, prodOffset, qty] of [["A", -2, 120], ["B", -7, 15]] as const) {
      const batchNo = `${v.sku}-DEMO-${suffix}`;
      await db.inventoryBatch.upsert({
        where: { batchNo },
        update: {},
        create: {
          batchNo, variantId: variant.id, locationId: loc.id,
          productionDate: day(prodOffset), expiryDate: day(prodOffset + 10),
          receivedQty: qty, onHandQty: qty, unitCost: v.cost,
          movements: { create: { type: "PRODUCTION_IN", variantId: variant.id, quantity: qty, unitCost: v.cost, note: "Demo seed" } },
        },
      });
    }
  }

  const sauce = await db.product.upsert({
    where: { slug: "nem-dipping-sauce" },
    update: {},
    create: {
      slug: "nem-dipping-sauce", nameKm: "ទឹកជ្រលក់ណែម", nameEn: "Nem Dipping Sauce",
      descriptionKm: "ទឹកជ្រលក់ផ្អែមហឹរ សម្រាប់ណែម។", descriptionEn: "Sweet-chilli dipping sauce made for nem.",
      categoryId: (await db.category.findUniqueOrThrow({ where: { slug: "sauces" } })).id, shelfLifeDays: 60,
    },
  });
  await db.productVariant.upsert({
    where: { sku: "SAUCE-250" },
    update: {},
    create: { productId: sauce.id, sku: "SAUCE-250", nameKm: "ដប ២៥០មល", nameEn: "250 ml bottle", weightGrams: 300, packagingGrams: 0, retailPrice: 3000, costPrice: 1500 },
  });

  // Wholesale tiers from the spec (sample prices) for the Small Pack.
  if (!(await db.priceList.count({ where: { isWholesaleDefault: true } }))) {
    const small = await db.productVariant.findUniqueOrThrow({ where: { sku: "NEM-S" } });
    await db.priceList.create({
      data: {
        name: "Wholesale (standard)",
        isWholesaleDefault: true,
        items: {
          create: [
            { variantId: small.id, minQty: 1, maxQty: 9, unitPrice: 5000 },
            { variantId: small.id, minQty: 10, maxQty: 49, unitPrice: 4500 },
            { variantId: small.id, minQty: 50, maxQty: 99, unitPrice: 4000 },
            { variantId: small.id, minQty: 100, maxQty: null, unitPrice: 3500 },
          ],
        },
      },
    });
  }
}

async function seedFinance() {
  const cats: [string, string, string, "OPERATING" | "DELIVERY" | "INVENTORY"][] = [
    ["RAW_MATERIALS", "វត្ថុធាតុដើម", "Raw Materials", "INVENTORY"],
    ["PRODUCT_PURCHASE", "ទិញផលិតផល", "Product Purchase", "INVENTORY"],
    ["PACKAGING", "វេចខ្ចប់", "Packaging", "INVENTORY"],
    ["PRODUCTION_LABOR", "កម្លាំងពលកម្មផលិត", "Production Labor", "INVENTORY"],
    ["DELIVERY", "ដឹកជញ្ជូន", "Delivery and Transport", "DELIVERY"],
    ["FUEL", "ប្រេងឥន្ធនៈ", "Fuel", "DELIVERY"],
    ["SALARY", "ប្រាក់ខែបុគ្គលិក", "Staff Salary", "OPERATING"],
    ["ELECTRICITY", "អគ្គិសនី", "Electricity", "OPERATING"],
    ["WATER", "ទឹក", "Water", "OPERATING"],
    ["RENT", "ថ្លៃជួល", "Rent", "OPERATING"],
    ["INTERNET", "អ៊ីនធឺណិត", "Internet", "OPERATING"],
    ["FB_ADS", "ផ្សាយពាណិជ្ជកម្ម Facebook", "Facebook Advertising", "OPERATING"],
    ["MARKETING", "ទីផ្សារ", "Marketing", "OPERATING"],
    ["OFFICE", "ការិយាល័យ", "Office Expenses", "OPERATING"],
    ["SPOILAGE", "ការខូចខាតស្តុក", "Inventory Spoilage", "OPERATING"],
    ["MISC", "ផ្សេងៗ", "Miscellaneous", "OPERATING"],
  ];
  for (const [code, km, en, cls] of cats) {
    await db.expenseCategory.upsert({ where: { code }, update: { class: cls }, create: { code, nameKm: km, nameEn: en, class: cls } });
  }
  const accounts: [string, string, "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"][] = [
    ["1000", "Cash", "ASSET"], ["1010", "Bank / KHQR", "ASSET"], ["1100", "Accounts Receivable", "ASSET"],
    ["1200", "Inventory", "ASSET"], ["2000", "Accounts Payable", "LIABILITY"], ["3000", "Owner Equity", "EQUITY"],
    ["4000", "Retail Sales", "REVENUE"], ["4010", "Wholesale Sales", "REVENUE"], ["4100", "Delivery Revenue", "REVENUE"],
    ["4900", "Sales Discounts & Returns", "REVENUE"], ["5000", "Cost of Goods Sold", "EXPENSE"],
    ["6000", "Delivery Expense", "EXPENSE"], ["6100", "Operating Expense", "EXPENSE"], ["6900", "Inventory Write-off", "EXPENSE"],
  ];
  for (const [code, name, type] of accounts) {
    await db.financialAccount.upsert({ where: { code }, update: {}, create: { code, name, type } });
  }
  await db.currency.upsert({ where: { code: "KHR" }, update: {}, create: { code: "KHR", symbol: "៛", decimals: 0 } });
  await db.currency.upsert({ where: { code: "USD" }, update: {}, create: { code: "USD", symbol: "$", decimals: 2 } });
  await db.exchangeRate.upsert({
    where: { fromCurrency_toCurrency_effectiveDate: { fromCurrency: "USD", toCurrency: "KHR", effectiveDate: day(0) } },
    update: {},
    create: { fromCurrency: "USD", toCurrency: "KHR", rate: 4100, effectiveDate: day(0) },
  });
}

async function seedSettings() {
  const settings: Record<string, unknown> = {
    "business.name": { km: "ណែមបាត់ដំបង", en: "Nem Battambang" },
    "business.phone": "012 345 678",
    "business.address": { km: "ក្រុងបាត់ដំបង ខេត្តបាត់ដំបង", en: "Battambang City, Battambang" },
    "business.facebook": "https://facebook.com/",
    "business.telegram": "https://t.me/",
    "locale.default": "km",
    "currency.reporting": "KHR",
    "inventory.minRemainingShelfDays": 2,
    "wholesale.minQty": 10,
    "tax.vatPercent": 0,
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.systemSetting.upsert({ where: { key }, update: {}, create: { key, value: value as object } });
  }
}

async function seedDemoCustomers() {
  const pp = await db.province.findUniqueOrThrow({ where: { code: "12" } });
  const btb = await db.province.findUniqueOrThrow({ where: { code: "02" } });
  if (await db.customer.count()) return;
  await db.customer.create({
    data: {
      code: "CUS-00001", fullName: "Chan Sreypov (demo)", phone: "010 000 001", type: "RETAIL", acquisitionSource: "FACEBOOK",
      addresses: { create: { recipientName: "Chan Sreypov", phone: "010 000 001", provinceId: pp.id, street: "St. 271 (demo)", isDefault: true } },
    },
  });
  await db.customer.create({
    data: {
      code: "CUS-00002", fullName: "Lim Vannak (demo)", phone: "010 000 002", type: "WHOLESALE", wholesaleStatus: "APPROVED",
      businessName: "Vannak Mini Mart (demo)", contactPerson: "Lim Vannak", creditLimit: 500000, acquisitionSource: "TELEGRAM",
      addresses: { create: { recipientName: "Vannak Mini Mart", phone: "010 000 002", provinceId: btb.id, isDefault: true } },
    },
  });
  await db.sequence.upsert({ where: { key: "CUSTOMER" }, update: { value: 2 }, create: { key: "CUSTOMER", value: 2 } });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nem.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 10) {
    throw new Error("Set SEED_ADMIN_PASSWORD (10+ chars) in .env before seeding.");
  }
  await seedRbac();
  await seedUser(adminEmail, "Owner", adminPassword, "SUPER_ADMIN");
  await seedLocations();
  await seedDelivery();
  await seedCatalog();
  await seedFinance();
  await seedSettings();
  await seedDemoCustomers();
  console.log("Seed complete (demo data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
