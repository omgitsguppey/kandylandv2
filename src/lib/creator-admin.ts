export const PRIMARY_CREATOR_OWNER_EMAIL = "uylusjohnson@gmail.com";

export function isCreatorOwnerEmail(email: string | null | undefined) {
    return typeof email === "string" && email.trim().toLowerCase() === PRIMARY_CREATOR_OWNER_EMAIL;
}
