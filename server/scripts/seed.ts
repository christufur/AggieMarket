/**
 * TASK-6 — Seed realistic NMSU-flavored data into the production DB.
 * Idempotent: guarded by a seed_version key in seed_meta.
 *
 * Run: bun scripts/seed.ts
 */

import { Database } from "bun:sqlite";
import crypto from "crypto";

const SEED_VERSION = "v1";
const db = new Database("db.sqlite");
db.run("PRAGMA journal_mode=WAL;");

// ── Guard ──────────────────────────────────────────────────────────────────────
const existing = db.query("SELECT value FROM seed_meta WHERE key = 'seed_version'").get() as { value: string } | null;
if (existing?.value === SEED_VERSION) {
    console.log(`Seed ${SEED_VERSION} already applied — nothing to do.`);
    process.exit(0);
}

console.log(`Applying seed ${SEED_VERSION}…`);

// ── Seed Users ─────────────────────────────────────────────────────────────────
type SeedUser = { id: number; email: string; name: string };

const seedUsers: { email: string; name: string; bio: string; isAdmin?: boolean }[] = [
    { email: "aggiemarket.admin@nmsu.edu", name: "AggieMarket Admin", bio: "Platform administrator.", isAdmin: true },
    { email: "ramos.alex@nmsu.edu", name: "Alex Ramos", bio: "Junior studying Computer Science. Selling textbooks and tech gear." },
    { email: "chen.mia@nmsu.edu", name: "Mia Chen", bio: "Senior in Biology. Tutoring sciences and selling lab supplies." },
    { email: "torres.carlos@nmsu.edu", name: "Carlos Torres", bio: "Engineering student with a mountain bike for sale." },
    { email: "patel.priya@nmsu.edu", name: "Priya Patel", bio: "Graphic design major, offering logo and poster design services." },
    { email: "williams.jay@nmsu.edu", name: "Jay Williams", bio: "Junior in Business, selling dorm furniture." },
];

const insertedUsers: SeedUser[] = [];

// Bcrypt-compatible hash — Bun.password.hash uses bcrypt by default
const placeholder = await Bun.password.hash("SeedPass123!");

for (const u of seedUsers) {
    let row = db.query("SELECT id, email, name FROM users WHERE email = ?").get(u.email) as SeedUser | null;
    if (!row) {
        db.run(
            `INSERT INTO users (email, name, password_hash, bio, status, is_admin)
             VALUES (?, ?, ?, ?, 'active', ?)`,
            [u.email, u.name, placeholder, u.bio, u.isAdmin ? 1 : 0]
        );
        row = db.query("SELECT id, email, name FROM users WHERE email = ?").get(u.email) as SeedUser;
        console.log(`  Created user: ${u.name} (${u.email})${u.isAdmin ? " [admin]" : ""}`);
    } else {
        // Ensure admin flag is set if needed
        if (u.isAdmin) db.run("UPDATE users SET is_admin = 1 WHERE id = ?", [row.id]);
        console.log(`  User already exists: ${u.name}`);
    }
    insertedUsers.push(row);
}

const [_admin, alex, mia, carlos, priya, jay] = insertedUsers;

// ── Listings ───────────────────────────────────────────────────────────────────
const listings: {
    seller: SeedUser;
    title: string;
    description: string;
    price: number | null;
    is_free: boolean;
    category: string;
    condition: string;
}[] = [
    {
        seller: alex,
        title: "Calculus: Early Transcendentals (8th Ed)",
        description: "Used for MATH 191 / 192. Minor highlighting in chapters 1-3, otherwise clean. Comes with access code booklet (unused).",
        price: 45,
        is_free: false,
        category: "Textbooks",
        condition: "Good",
    },
    {
        seller: alex,
        title: "TI-84 Plus CE Graphing Calculator",
        description: "Works perfectly, includes USB cable and AAA batteries. Some minor scratches on back cover. Required for MATH and engineering courses.",
        price: 65,
        is_free: false,
        category: "Electronics",
        condition: "Good",
    },
    {
        seller: alex,
        title: 'MacBook Pro 13" 2020 M1',
        description: "M1 chip, 8GB RAM, 256GB SSD. Battery health 91%. Comes with original charger and box. Great condition — upgrading to M3.",
        price: 750,
        is_free: false,
        category: "Electronics",
        condition: "Like New",
    },
    {
        seller: mia,
        title: "Dorm Mini Fridge (Compact, 3.2 cu ft)",
        description: "Perfect for dorm use, barely used. Kenmore brand. Moving off-campus so no longer needed. Pick up from Corbett Hall.",
        price: 60,
        is_free: false,
        category: "Appliances",
        condition: "Good",
    },
    {
        seller: mia,
        title: "Organic Chemistry Textbook (McMurry, 9th Ed)",
        description: "Used for CHEM 313/314. Some pencil notes in margins, all erasable. Good study resource alongside the course.",
        price: 40,
        is_free: false,
        category: "Textbooks",
        condition: "Fair",
    },
    {
        seller: carlos,
        title: "Trek Marlin 7 Mountain Bike (29\")",
        description: "2022 model, ridden mostly on the NMSU trails. Hydraulic disc brakes, 1x12 drivetrain. Includes helmet, lock, and pump.",
        price: 520,
        is_free: false,
        category: "Sports",
        condition: "Good",
    },
    {
        seller: carlos,
        title: "Ikea MALM Desk (White, 140×65cm)",
        description: "Moving off-campus, desk must go. Solid surface, minor scuff on one corner. Easy to disassemble and transport.",
        price: 55,
        is_free: false,
        category: "Furniture",
        condition: "Good",
    },
    {
        seller: jay,
        title: "HP LaserJet Printer (Wireless)",
        description: "HP LaserJet Pro M404dn. Works great, printing about 200 pages total. Comes with extra toner cartridge.",
        price: 120,
        is_free: false,
        category: "Electronics",
        condition: "Like New",
    },
    {
        seller: jay,
        title: "LED Desk Lamp with USB Charging Port",
        description: "3 brightness levels, foldable arm, built-in USB-A port. Perfect for late-night study sessions.",
        price: 18,
        is_free: false,
        category: "Dorm Supplies",
        condition: "Like New",
    },
    {
        seller: priya,
        title: "Design for Media Arts Textbook",
        description: "Used for ART 101 at NMSU. Includes CD-ROM (unopened). Lightly annotated.",
        price: 25,
        is_free: false,
        category: "Textbooks",
        condition: "Good",
    },
    {
        seller: alex,
        title: "Microeconomics Textbook (Pindyck, 8th Ed)",
        description: "Required for ECON 251. No writing inside. Perfect condition.",
        price: 35,
        is_free: false,
        category: "Textbooks",
        condition: "Like New",
    },
    {
        seller: mia,
        title: "Yoga Mat + Resistance Bands Set",
        description: "Non-slip yoga mat (6mm) plus a set of 5 resistance bands. Used only a few times. Great for the NMSU Rec Center.",
        price: 20,
        is_free: false,
        category: "Sports",
        condition: "Like New",
    },
    {
        seller: jay,
        title: "2 Tickets — Aggie Basketball (Sat April 26)",
        description: "Can't make it to the game. Selling both tickets together at face value. Seats together in section C.",
        price: 24,
        is_free: false,
        category: "Tickets",
        condition: "New",
    },
    {
        seller: carlos,
        title: "Standing Desk Converter",
        description: "Adjustable sit-stand desk riser. Supports up to 35 lbs. Good condition, minor surface scratches.",
        price: 50,
        is_free: false,
        category: "Furniture",
        condition: "Good",
    },
    {
        seller: mia,
        title: "Free: Moving Boxes (10 pcs)",
        description: "Assorted moving boxes, mostly 16×12×12. Free to anyone moving at end of semester. Pick up from Garcia Hall.",
        price: null,
        is_free: true,
        category: "Free",
        condition: "Fair",
    },
];

let listingCount = 0;
for (const l of listings) {
    const id = crypto.randomUUID();
    db.run(
        `INSERT INTO listings (id, seller_id, title, description, price, is_free, category, condition, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [id, l.seller.id, l.title, l.description, l.price, l.is_free ? 1 : 0, l.category, l.condition]
    );
    listingCount++;
}
console.log(`  Inserted ${listingCount} listings`);

// ── Services ───────────────────────────────────────────────────────────────────
const services: {
    provider: SeedUser;
    title: string;
    description: string;
    price: number;
    price_type: string;
    category: string;
    availability: string;
}[] = [
    {
        provider: mia,
        title: "Biology & Chemistry Tutoring",
        description: "NMSU Biology senior offering tutoring for BIOL 111, BIOL 112, CHEM 110, CHEM 311. Can meet at Zuhl Library or Corbett Center.",
        price: 20,
        price_type: "hourly",
        category: "Tutoring",
        availability: "MTWTh evenings, Sat mornings",
    },
    {
        provider: priya,
        title: "Logo & Brand Identity Design",
        description: "Graphic design major with 3 years of experience. Logos, business cards, social media kits. Portfolio available on request.",
        price: 75,
        price_type: "flat",
        category: "Design",
        availability: "Flexible, turnaround 3-5 days",
    },
    {
        provider: alex,
        title: "Python / Web Dev Tutoring",
        description: "CS junior comfortable with Python, JavaScript, React, and SQL. Happy to help debug assignments or prep for CS exams.",
        price: 18,
        price_type: "hourly",
        category: "Tutoring",
        availability: "Weekends and Fri afternoons",
    },
    {
        provider: jay,
        title: "Move-In / Move-Out Help",
        description: "Have a truck and strong back. Available to help with dorm or apartment moves at end of semester. $40 flat for 2hrs.",
        price: 40,
        price_type: "flat",
        category: "Moving",
        availability: "May 10-18 (end of semester)",
    },
    {
        provider: priya,
        title: "Event Photography",
        description: "Photography major offering affordable event and portrait photos. Edited gallery delivered within 48 hrs. Perfect for grad photos or club events.",
        price: 50,
        price_type: "hourly",
        category: "Photography",
        availability: "Weekends, advance booking required",
    },
    {
        provider: carlos,
        title: "Bike Tune-Up & Minor Repairs",
        description: "Experienced cyclist offering basic tune-ups: brake adjustment, gear tuning, tire replacement. Parts cost extra.",
        price: 15,
        price_type: "flat",
        category: "Repair",
        availability: "Weekends",
    },
    {
        provider: mia,
        title: "MCAT / Pre-Med Study Partner",
        description: "Pre-med senior who scored 514 on the MCAT. Looking to form a small study group or do 1-on-1 prep sessions.",
        price: 15,
        price_type: "hourly",
        category: "Tutoring",
        availability: "Flexible, schedule via text",
    },
    {
        provider: jay,
        title: "Proofread / Edit Your Essays & Resumes",
        description: "Business major, strong writer. Will proofread and give feedback on essays, cover letters, and resumes. Fast turnaround.",
        price: 10,
        price_type: "flat",
        category: "Writing",
        availability: "Anytime, 24hr turnaround",
    },
];

let serviceCount = 0;
for (const s of services) {
    const id = crypto.randomUUID();
    db.run(
        `INSERT INTO services (id, provider_id, title, description, price, price_type, category, availability, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [id, s.provider.id, s.title, s.description, s.price, s.price_type, s.category, s.availability]
    );
    serviceCount++;
}
console.log(`  Inserted ${serviceCount} services`);

// ── Events ─────────────────────────────────────────────────────────────────────
function daysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
}

const events: {
    organizer: SeedUser;
    title: string;
    description: string;
    category: string;
    location: string;
    starts_at: string;
    ends_at: string;
    is_free: boolean;
    ticket_price: number | null;
}[] = [
    {
        organizer: priya,
        title: "NMSU Spring Career Fair 2026",
        description: "Connect with 50+ employers recruiting for internships and full-time roles. Bring resumes and dress professionally. Open to all NMSU students.",
        category: "Career",
        location: "NMSU Corbett Center Ballroom",
        starts_at: daysFromNow(8),
        ends_at: daysFromNow(8),
        is_free: true,
        ticket_price: null,
    },
    {
        organizer: jay,
        title: "End-of-Semester Bonfire & BBQ",
        description: "Wind down after finals with the Aggie community. Free food, music, and a bonfire at the Horseshoe. Bring your friends!",
        category: "Social",
        location: "NMSU Horseshoe Lawn",
        starts_at: daysFromNow(14),
        ends_at: daysFromNow(14),
        is_free: true,
        ticket_price: null,
    },
    {
        organizer: alex,
        title: "Hackathon: Aggie Build Weekend",
        description: "48-hour hackathon open to all skill levels. Form teams of up to 4. Prizes: $500, $250, $100. Meals provided. Theme announced at kickoff.",
        category: "Technology",
        location: "Engineering Complex E101",
        starts_at: daysFromNow(11),
        ends_at: daysFromNow(13),
        is_free: true,
        ticket_price: null,
    },
    {
        organizer: mia,
        title: "Pre-Med & MCAT Study Workshop",
        description: "Prep workshop covering CARS and Bio/Biochem sections. Led by students who have taken the MCAT. Limited to 15 students — register early.",
        category: "Academic",
        location: "Foster Hall Room 120",
        starts_at: daysFromNow(5),
        ends_at: daysFromNow(5),
        is_free: false,
        ticket_price: 5,
    },
    {
        organizer: carlos,
        title: "Organ Mountain Trail Ride",
        description: "Casual group mountain bike ride in the Organ Mountains. Intermediate-friendly. Bring water, snacks, and a helmet. 2-hour ride.",
        category: "Sports",
        location: "Dripping Springs Trailhead, Las Cruces",
        starts_at: daysFromNow(3),
        ends_at: daysFromNow(3),
        is_free: true,
        ticket_price: null,
    },
];

let eventCount = 0;
for (const e of events) {
    const id = crypto.randomUUID();
    db.run(
        `INSERT INTO events (id, organizer_id, title, description, category, location, starts_at, ends_at, is_free, ticket_price, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [id, e.organizer.id, e.title, e.description, e.category, e.location, e.starts_at, e.ends_at, e.is_free ? 1 : 0, e.ticket_price]
    );
    eventCount++;
}
console.log(`  Inserted ${eventCount} events`);

// ── Mark done ──────────────────────────────────────────────────────────────────
db.run(
    `INSERT INTO seed_meta (key, value) VALUES ('seed_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SEED_VERSION]
);

console.log(`\nSeed ${SEED_VERSION} complete:`);
console.log(`  ${listingCount} listings, ${serviceCount} services, ${eventCount} events`);
console.log(`  Admin account: aggiemarket.admin@nmsu.edu / SeedPass123!`);
console.log(`  Change admin password before demo day.`);
