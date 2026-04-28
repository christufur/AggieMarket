/**
 * Seed script — creates test users, a conversation, and messages.
 * Run: cd server && bun run seed.ts
 */
import db from "./src/db";

async function seed() {
  console.log("Seeding test data...");

  // Check if test users already exist
  const existing = db.query("SELECT id FROM users WHERE email = 'testbuyer@nmsu.edu'").get();
  if (existing) {
    console.log("Seed data already exists. Skipping.");
    return;
  }

  // Create two test users (password: "password123" for both)
  const hash = await Bun.password.hash("password123");

  db.run(
    "INSERT INTO users (name, email, password_hash, status) VALUES (?, ?, ?, 'active')",
    ["Jordan Lee", "testbuyer@nmsu.edu", hash]
  );
  const buyer = db.query("SELECT id FROM users WHERE email = 'testbuyer@nmsu.edu'").get() as { id: number };

  db.run(
    "INSERT INTO users (name, email, password_hash, status) VALUES (?, ?, ?, 'active')",
    ["Priya Sharma", "testseller@nmsu.edu", hash]
  );
  const seller = db.query("SELECT id FROM users WHERE email = 'testseller@nmsu.edu'").get() as { id: number };

  console.log(`Created users: buyer(${buyer.id}), seller(${seller.id})`);

  // Create a test listing from seller
  const listingId = crypto.randomUUID();
  db.run(
    `INSERT INTO listings (id, seller_id, title, description, price, category, condition, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [listingId, seller.id, 'MacBook Pro 14" M3', "Great condition, barely used. Comes with charger.", 1200, "Electronics", "Like New"]
  );
  console.log(`Created listing: ${listingId}`);

  // Create a conversation between buyer and seller about the listing
  const convoId = crypto.randomUUID();
  db.run(
    "INSERT INTO conversations (id, buyer_id, seller_id, listing_id, last_message_at) VALUES (?, ?, ?, ?, datetime('now'))",
    [convoId, buyer.id, seller.id, listingId]
  );
  console.log(`Created conversation: ${convoId}`);

  // Add some messages
  const messages = [
    { sender: buyer.id, content: "Hey, is this MacBook still available?", minutesAgo: 30 },
    { sender: seller.id, content: "Yes it is! Are you interested?", minutesAgo: 28 },
    { sender: buyer.id, content: "Definitely. Can you do $1100?", minutesAgo: 25 },
    { sender: seller.id, content: "I could do $1150, it's practically brand new", minutesAgo: 20 },
    { sender: buyer.id, content: "Deal! Can we meet on campus tomorrow?", minutesAgo: 15 },
    { sender: seller.id, content: "Sure, how about Zuhl Library at 2pm?", minutesAgo: 10 },
  ];

  for (const msg of messages) {
    const msgId = crypto.randomUUID();
    const createdAt = new Date(Date.now() - msg.minutesAgo * 60 * 1000).toISOString();
    db.run(
      "INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
      [msgId, convoId, msg.sender, msg.content, createdAt]
    );
  }
  console.log(`Created ${messages.length} messages`);

  // Create a second conversation (no listing, just direct message)
  const convo2Id = crypto.randomUUID();
  db.run(
    "INSERT INTO conversations (id, buyer_id, seller_id, last_message_at) VALUES (?, ?, ?, datetime('now', '-2 hours'))",
    [convo2Id, seller.id, buyer.id]
  );

  const msg2Id = crypto.randomUUID();
  db.run(
    "INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, datetime('now', '-2 hours'))",
    [msg2Id, convo2Id, seller.id, "Hey, do you tutor for CS 271?"]
  );
  console.log("Created second conversation with 1 message");

  console.log("\n--- Test Accounts ---");
  console.log("Buyer:  testbuyer@nmsu.edu  / password123");
  console.log("Seller: testseller@nmsu.edu / password123");
  console.log("\nLog in as buyer to see conversation with seller about MacBook listing.");
  console.log("Done!");
}

seed().catch(console.error);
