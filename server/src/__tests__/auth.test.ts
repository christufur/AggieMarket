import { describe, it, expect, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import db from "../db";
import authRoutes from "../routes/auth";

// Standalone app for testing auth routes
const app = new Elysia().use(authRoutes);

function json(body: object) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  // Clear test data between tests
  db.run("DELETE FROM email_verifications");
  db.run("DELETE FROM users");
});

describe("POST /auth/register", () => {
  it("rejects non-NMSU emails", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/register", {
        ...json({ name: "Test User", email: "test@gmail.com", password: "password123" }),
      })
    );
    const data = await res.json() as any;
    expect(data.message).toBe("Email must end with @nmsu.edu");
    expect(data.status).toBe(400);
  });

  it("creates account for valid NMSU email", async () => {
    const res = await app.handle(
      new Request("http://localhost/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test User", email: "testuser@nmsu.edu", password: "password123" }),
      })
    );
    const data = await res.json() as any;
    expect(data.status).toBe(201);
    expect(data.message).toContain("verification code");
  });

  it("rejects duplicate email", async () => {
    const payload = JSON.stringify({ name: "Test User", email: "dup@nmsu.edu", password: "password123" });
    await app.handle(new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }));
    const res = await app.handle(new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(400);
    expect(data.message).toContain("already exists");
  });
});

describe("POST /auth/verify-email", () => {
  it("verifies a valid token and activates user", async () => {
    // Register a user first
    await app.handle(new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Verify Me", email: "verify@nmsu.edu", password: "password123" }),
    }));

    // Pull the token directly from the test DB
    const record = db.query("SELECT token FROM email_verifications WHERE email = ?").get("verify@nmsu.edu") as { token: string };
    expect(record).toBeTruthy();

    const res = await app.handle(new Request("http://localhost/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "verify@nmsu.edu", token: record.token }),
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(200);
    expect(data.message).toContain("verified");
  });

  it("rejects an invalid token", async () => {
    const res = await app.handle(new Request("http://localhost/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@nmsu.edu", token: "000000" }),
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(400);
    expect(data.message).toContain("Invalid");
  });

  it("rejects an expired token", async () => {
    // Insert a user and an expired token directly
    db.run("INSERT INTO users (name, email, password_hash, status) VALUES (?, ?, ?, ?)", [
      "Expired User", "expired@nmsu.edu", "hash", "pending_verification"
    ]);
    const user = db.query("SELECT id FROM users WHERE email = ?").get("expired@nmsu.edu") as { id: number };
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString();
    db.run(
      "INSERT INTO email_verifications (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)",
      [user.id, "expired@nmsu.edu", "123456", pastDate]
    );

    const res = await app.handle(new Request("http://localhost/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "expired@nmsu.edu", token: "123456" }),
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(400);
    expect(data.message).toContain("expired");
  });
});

describe("POST /auth/login", () => {
  it("rejects login for unknown email", async () => {
    const res = await app.handle(new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@nmsu.edu", password: "password123" }),
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(401);
  });

  it("rejects login for unverified user", async () => {
    await app.handle(new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unverified", email: "unverified@nmsu.edu", password: "password123" }),
    }));
    const res = await app.handle(new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unverified@nmsu.edu", password: "password123" }),
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(403);
    expect(data.message).toContain("verify your email");
  });

  it("returns a JWT token for valid credentials", async () => {
    // Register + verify
    await app.handle(new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Login Test", email: "logintest@nmsu.edu", password: "password123" }),
    }));
    const record = db.query("SELECT token FROM email_verifications WHERE email = ?").get("logintest@nmsu.edu") as { token: string };
    await app.handle(new Request("http://localhost/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "logintest@nmsu.edu", token: record.token }),
    }));

    const res = await app.handle(new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "logintest@nmsu.edu", password: "password123" }),
    }));
    const data = await res.json() as any;
    expect(data.status).toBe(200);
    expect(typeof data.token).toBe("string");
    expect(data.token.length).toBeGreaterThan(0);
  });
});
