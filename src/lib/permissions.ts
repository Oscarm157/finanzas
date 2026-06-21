import type { UserRole } from "./schema";

// Roles del starter: admin (todo), member (opera), viewer (solo lectura).
// Ajusta o amplía por proyecto.
export const isAdmin = (r: UserRole) => r === "admin";
export const canWrite = (r: UserRole) => r === "admin" || r === "member";
