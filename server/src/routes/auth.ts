import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import db from "../db";
import { sendVerificationEmail } from "../utils/email";

const isValidEmail = (email: string) => email.endsWith("@nmsu.edu");

const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

const authRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))

    .post("/auth/register", async ({ body }) => {
        const { name, email, password } = body as { name: string, email: string, password: string }

        if (!isValidEmail(email)) {
            return { message: "Email must end with @nmsu.edu", status: 400 }
        }

        const existing = db.query("SELECT id FROM users WHERE email = ?").get(email);
        if (existing) {
            return { message: "An account with this email already exists", status: 400 }
        }

        const hashedPassword = await Bun.password.hash(password)

        const result = db.run(
            `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        const userId = result.lastInsertRowid;

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        db.run(
            `INSERT INTO email_verifications (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)`,
            [userId, email, token, expiresAt]
        );

        sendVerificationEmail(email, token).catch(() => {});

        return { message: "Account created. Check your NMSU email for a verification code.", status: 201 }
    })

    .post("/auth/verify-email", ({ body }) => {
        const { email, token } = body as { email: string, token: string }

        const record = db.query(`
            SELECT * FROM email_verifications
            WHERE email = ? AND token = ? AND used_at IS NULL
        `).get(email, token) as { id: number, user_id: number, expires_at: string } | null;

        if (!record) {
            return { message: "Invalid or already used verification code", status: 400 }
        }

        if (new Date(record.expires_at) < new Date()) {
            return { message: "Verification code has expired", status: 400 }
        }

        db.run(`UPDATE users SET status = 'active' WHERE id = ?`, [record.user_id]);
        db.run(`UPDATE email_verifications SET used_at = datetime('now') WHERE id = ?`, [record.id]);

        return { message: "Email verified. You can now log in.", status: 200 }
    })

    .post("/auth/login", async ({ body, jwt }) => {
        const { email, password } = body as { email: string, password: string }

        const user = db.query(`SELECT * FROM users WHERE email = ?`).get(email) as {
            id: number,
            email: string,
            password_hash: string,
            status: string
        } | null;

        if (!user) {
            return { message: "Invalid email or password", status: 401 };
        }

        if (user.status === "pending_verification") {
            return { message: "Please verify your email before logging in", status: 403 };
        }

        const isPasswordValid = await Bun.password.verify(password, user.password_hash);

        if (!isPasswordValid) {
            return { message: "Invalid email or password", status: 401 };
        }

        const token = await jwt.sign({ id: user.id, email: user.email });
        return { token, status: 200 }
    })

    .get("/auth/me", async ({ headers, jwt }) => {
        const token = headers["authorization"]?.replace("Bearer ", "");

        if (!token) {
            return { message: "No token provided", status: 401 };
        }

        const payload = await jwt.verify(token) as { id: number, email: string } | false;

        if (!payload) {
            return { message: "Invalid token", status: 401 };
        }

        const user = db.query(
            "SELECT id, name, email, status FROM users WHERE id = ?"
        ).get(payload.id);

        if (!user) {
            return { message: "User not found", status: 404 };
        }

        return { user, status: 200 }
    })

export default authRoutes
