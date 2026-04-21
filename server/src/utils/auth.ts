export type JwtPayload = { id: number; email: string };

export async function requireAuth(
    headers: Record<string, string | undefined>,
    jwt: { verify: (token: string) => Promise<Record<string, unknown> | false> }
): Promise<JwtPayload | { message: string; status: 401 }> {
    const token = headers["authorization"]?.replace("Bearer ", "");
    if (!token) return { message: "Unauthorized", status: 401 };
    const payload = await jwt.verify(token);
    if (!payload) return { message: "Invalid token", status: 401 };
    return payload as unknown as JwtPayload;
}

export function parsePagination(query: Record<string, unknown>) {
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 20));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}
