"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { run, UserError } from "@/lib/action";
import { requirePermission } from "@/features/auth/guard";
import { staffUserSchema } from "./schemas";
import { checkUserChange } from "./rules";

export async function saveStaffUser(input: unknown) {
  return run(async () => {
    const actor = await requirePermission("user.manage");
    const { id, name, email, phone, password, roles, isActive } = staffUserSchema.parse(input);
    if (!id && (!password || password.length < 10)) throw new UserError("VALIDATION");
    if (password && password.length < 10) throw new UserError("VALIDATION");

    const saved = await db.$transaction(async (tx) => {
      const before = id
        ? await tx.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } })
        : null;
      if (id && !before) throw new UserError("NOT_FOUND");
      const currentRoles = before?.roles.map((r) => r.role.code) ?? [];
      const problem = checkUserChange({
        actorId: actor.id,
        actorRoles: actor.roleCodes,
        targetId: id ?? null,
        targetCurrentRoles: currentRoles,
        nextRoles: roles,
        nextActive: isActive,
      });
      if (problem) throw new UserError(problem);

      const data = {
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        isActive,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      };
      const user = id
        ? await tx.user.update({ where: { id }, data })
        : await tx.user.create({ data: { ...data, passwordHash: data.passwordHash! } });

      // Replace staff roles; keep customer roles (a staff member may also shop).
      const roleRows = await tx.role.findMany({ where: { code: { in: roles } } });
      await tx.userRole.deleteMany({ where: { userId: user.id, role: { code: { notIn: ["RETAIL_CUSTOMER", "WHOLESALE_CUSTOMER"] } } } });
      await tx.userRole.createMany({ data: roleRows.map((r) => ({ userId: user.id, roleId: r.id })), skipDuplicates: true });

      await audit(tx, {
        userId: actor.id,
        action: id ? "user.update" : "user.create",
        entityType: "user",
        entityId: user.id,
        before: before && { name: before.name, email: before.email, isActive: before.isActive, roles: currentRoles },
        after: { name, email: data.email, isActive, roles, passwordChanged: !!password },
      });
      return user;
    });
    revalidatePath("/admin/users");
    return { id: saved.id };
  });
}
