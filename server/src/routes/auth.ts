import { Elysia } from "elysia"
import { jwt } from "@elysiajs/jwt"
import db from "../db";
import { sendVerificationEmail } from "../utils/email";

const isValidEmail = (email: string) => {
    return email.endsWith("@nmsu.edu")
}

const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

const authRoutes = new Elysia()
    .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET || "secret" }))

    .post("/auth/register", async ({ body }) => {
        const { name, email, password } = body as { name: string, email: string, password: string }

        //1. validate email
        if (!isValidEmail(email)) {
            return { message: "Email must end with @nmsu.edu", status: 400 }
        }

        //2. check if email already exists
        const existing = db.query("SELECT id FROM users WHERE email = ?").get(email);
        if (existing) {
            return { message: "An account with this email already exists", status: 400 }
        }

        //3. hash password
        const hashedPassword = await Bun.password.hash(password)

        //4. insert user
        const result = db.run(
            `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
            [name, email, hashedPassword]
        );

        const userId = result.lastInsertRowid;

        //5. generate and store verification token (6-digit code, 15 min expiry)
        const token = generateToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        db.run(
            `INSERT INTO email_verifications (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)`,
            [userId, email, token, expiresAt]
        );

        //6. send verification email
        await sendVerificationEmail(email, token);

        return { message: "Account created. Check your NMSU email for a verification code.", status: 201 }
    })

    .post("/auth/verify-email", ({ body }) => {
        const { email, token } = body as { email: string, token: string }

        //1. find the verification record
        const record = db.query(`
            SELECT * FROM email_verifications
            WHERE email = ? AND token = ? AND used_at IS NULL
        `).get(email, token) as { id: number, user_id: number, expires_at: string } | null;

        if (!record) {
            return { message: "Invalid or already used verification code", status: 400 }
        }

        //2. check expiry
        if (new Date(record.expires_at) < new Date()) {
            return { message: "Verification code has expired", status: 400 }
        }

        //3. activate user and mark token as used
        db.run(`UPDATE users SET status = 'active' WHERE id = ?`, [record.user_id]);
        db.run(`UPDATE email_verifications SET used_at = datetime('now') WHERE id = ?`, [record.id]);

        return { message: "Email verified. You can now log in.", status: 200 }
    })

    .post("/auth/login", async ({ body, jwt }) => {
        const { email, password } = body as { email: string, password: string }

        //1. find user by email
        const user = db.query(`SELECT * FROM users WHERE email = ?`).get(email) as {
            id: number,
            email: string,
            password_hash: string,
            status: string
        } | null;

        if (!user) {
            return { message: "Invalid email or password", status: 401 };
        }

        //2. check if verified
        if (user.status === "pending_verification") {
            return { message: "Please verify your email before logging in", status: 403 };
        }

        //3. verify password
        const isPasswordValid = await Bun.password.verify(password, user.password_hash);

        if (!isPasswordValid) {
            return { message: "Invalid email or password", status: 401 };
        }

        //4. sign and return JWT token
        const token = await jwt.sign({ id: user.id, email: user.email });
        return { token, status: 200 }
    })

    .get("/auth/me", async ({ headers, jwt }: { headers: Record<string, string | undefined>, jwt: any }) => {
        //1. pull token from Authorization header
        const token = headers.authorization?.replace("Bearer ", "");

        if (!token) {
            return { message: "No token provided", status: 401 };
        }

        //2. verify token
        const payload = await jwt.verify(token) as { id: number, email: string } | false;

        if (!payload) {
            return { message: "Invalid token", status: 401 };
        }

        //3. fetch user from db
        const user = db.query(
            "SELECT id, name, email, status FROM users WHERE id = ?"
        ).get(payload.id);

        if (!user) {
            return { message: "User not found", status: 404 };
        }

        return { user, status: 200 }
    })

export default authRoutes
