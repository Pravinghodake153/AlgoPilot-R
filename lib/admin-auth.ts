import { auth, clerkClient } from "@clerk/nextjs/server";

const DEFAULT_ADMIN_EMAILS = [
  "ghodakepravin153@gmail.com",
  "ghodakepravin154@gmail.com",
];

/**
 * Checks if the current request is from an authorized admin.
 * In development without Clerk keys configured, gracefully allows access for local testing.
 */
export async function authorizeAdmin(): Promise<boolean> {
  // If Clerk is not configured in local environment, allow admin access for local development
  if (!process.env.CLERK_SECRET_KEY && process.env.NODE_ENV === "development") {
    return true;
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      if (process.env.NODE_ENV === "development") return true;
      return false;
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase();
    
    const adminEmails = [
      ...DEFAULT_ADMIN_EMAILS,
      ...(process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.split(",").map((e) => e.trim().toLowerCase()) : []),
      ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : []),
    ];

    if (email && adminEmails.includes(email)) return true;
    if (process.env.NODE_ENV === "development") return true;
    return false;
  } catch (error) {
    console.warn("authorizeAdmin warning:", error);
    if (process.env.NODE_ENV === "development") return true;
    return false;
  }
}
