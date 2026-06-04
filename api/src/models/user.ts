import { eq } from "drizzle-orm";
import { db, usersTable, type User, type InsertUser, type PublicUser } from "@workspace/db";

export function omitPassword(user: User): PublicUser {
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function findUserById(id: number): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .limit(1);
  return rows[0];
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  username?: string;
  displayName?: string;
  role?: "user" | "admin";
}): Promise<PublicUser> {
  const rows = await db
    .insert(usersTable)
    .values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      username: data.username,
      displayName: data.displayName,
      role: data.role ?? "user",
    })
    .returning();

  const user = rows[0];
  if (!user) throw new Error("Failed to create user");
  return omitPassword(user);
}

export async function updateLastLogin(id: number): Promise<void> {
  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(usersTable.id, id));
}

export async function updateUserProfile(
  id: number,
  data: Partial<Pick<InsertUser, "displayName" | "avatarUrl" | "username">>,
): Promise<PublicUser | undefined> {
  const rows = await db
    .update(usersTable)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning();

  const user = rows[0];
  if (!user) return undefined;
  return omitPassword(user);
}
