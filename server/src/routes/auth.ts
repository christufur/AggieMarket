import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import crypto from "crypto";
import db from "../db";
import { sendVerificationEmail, sendPasswordResetEmail } from "../utils/email";

const isValidEmail = (email: string) => email.endsWith("@nmsu.edu");

const generateToken = () => crypto.randomInt(100000, 1000000).toString();

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

        console.log(`[DEV] Verification token for ${email}: ${token}`);
        sendVerificationEmail(email, token).catch((err) => {
            console.error(`[ERROR] Failed to send verification email to ${email}:`, err);
        });

        return { message: "Account created. Check your NMSU email for a verification code.", status: 201 }
    })

    .post("/auth/resend-verification", async ({ body }) => {
        const { email } = body as { email: string }

        //1. check user exists and is unverified
        const user = db.query(`SELECT id, status FROM users WHERE email = ?`).get(email) as {
            id: number, status: string
        } | null;

        // Always return a generic message to avoid email enumeration
        if (!user || user.status !== "pending_verification") {
            return { message: "If that email is registered and unverified, a new code has been sent.", status: 200 }
        }

        //2. generate new token and invalidate old ones
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        db.run(`UPDATE email_verifications SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL`, [user.id]);
        db.run(`INSERT INTO email_verifications (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)`, [user.id, email, token, expiresAt]);

        //3. send new verification email
        console.log(`[DEV] Resent verification token for ${email}: ${token}`);
        sendVerificationEmail(email, token).catch((err) => {
            console.error(`[ERROR] Failed to resend verification email to ${email}:`, err);
        });

        return { message: "If that email is registered and unverified, a new code has been sent.", status: 200 }
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

    .post("/auth/forgot-password", async ({ body }) => {
        const { email } = body as { email: string }

        const user = db.query(`SELECT id, status FROM users WHERE email = ?`).get(email) as {
            id: number, status: string
        } | null;

        // Generic response to prevent email enumeration
        const genericResponse = { message: "If that email is registered, a reset code has been sent.", status: 200 };

        if (!user || user.status !== "active") {
            return genericResponse;
        }

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        db.run(`UPDATE password_resets SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL`, [user.id]);
        db.run(`INSERT INTO password_resets (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)`, [user.id, email, token, expiresAt]);

        console.log(`[DEV] Password reset token for ${email}: ${token}`);
        sendPasswordResetEmail(email, token).catch((err) => {
            console.error(`[ERROR] Failed to send password reset email to ${email}:`, err);
        });

        return genericResponse;
    })

    .post("/auth/reset-password", async ({ body }) => {
        const { email, token, newPassword } = body as { email: string, token: string, newPassword: string }

        if (!newPassword || newPassword.length < 8) {
            return { message: "Password must be at least 8 characters.", status: 400 };
        }

        const record = db.query(`
            SELECT * FROM password_resets
            WHERE email = ? AND token = ? AND used_at IS NULL
        `).get(email, token) as { id: number, user_id: number, expires_at: string } | null;

        if (!record) {
            return { message: "Invalid or already used reset code.", status: 400 };
        }

        if (new Date(record.expires_at) < new Date()) {
            return { message: "Reset code has expired.", status: 400 };
        }

        const hashedPassword = await Bun.password.hash(newPassword);
        db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hashedPassword, record.user_id]);
        db.run(`UPDATE password_resets SET used_at = datetime('now') WHERE id = ?`, [record.id]);

        return { message: "Password updated. You can now log in.", status: 200 };
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
            "SELECT id, name, email, status, is_admin FROM users WHERE id = ?"
        ).get(payload.id);

        if (!user) {
            return { message: "User not found", status: 404 };
        }

        return { user, status: 200 }
    })

export default authRoutes
