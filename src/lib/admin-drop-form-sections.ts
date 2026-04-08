export type AdminDropFormSectionId = "basics" | "assets" | "pricing" | "actions";

export function toggleAdminDropFormSection(
    current: AdminDropFormSectionId | null,
    next: AdminDropFormSectionId,
): AdminDropFormSectionId | null {
    return current === next ? null : next;
}
