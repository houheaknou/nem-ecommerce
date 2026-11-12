"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/admin/data-table";
import { Field } from "@/components/admin/field";
import { saveStaffUser } from "@/features/users/actions";
import { staffUserSchema, type StaffUserInput } from "@/features/users/schemas";
import { useServerAction } from "@/hooks/use-action";
import { useAdminText } from "@/i18n/admin-text-context";

type Row = { id: string; name: string; email: string; phone: string; isActive: boolean; lastLoginAt: string; roles: string[] };
type RoleOption = { code: string; label: string };

export function UserManager({ users, roleOptions, meId, iAmSuper }: { users: Row[]; roleOptions: RoleOption[]; meId: string; iAmSuper: boolean }) {
  const { a } = useAdminText();
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const label = (code: string) => roleOptions.find((r) => r.code === code)?.label ?? code;

  const columns: ColumnDef<Row, unknown>[] = [
    { accessorKey: "name", header: a.users.name, cell: ({ row: { original: u } }) => (
      <span><b>{u.name}</b>{u.id === meId && <span className="ml-1 text-xs text-primary">(me)</span>}<span className="block text-xs text-muted-foreground">{u.email}</span></span>
    ) },
    { id: "roles", accessorFn: (u) => u.roles.join(" "), header: a.users.roles, cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">{row.original.roles.map((r) => <Badge key={r} variant="secondary" className="rounded-full">{label(r)}</Badge>)}</div>
    ) },
    { accessorKey: "lastLoginAt", header: a.users.lastLogin },
    { accessorKey: "isActive", header: a.common.status, cell: ({ row }) => (
      row.original.isActive ? <Badge className="rounded-full bg-success/15 text-success">{a.common.active}</Badge> : <Badge variant="secondary" className="rounded-full">{a.common.inactive}</Badge>
    ) },
    { id: "edit", header: "", cell: ({ row }) => {
      const locked = row.original.roles.includes("SUPER_ADMIN") && !iAmSuper;
      return (
        <Button size="icon" variant="ghost" className="rounded-full" disabled={locked} aria-label={a.common.edit} onClick={() => setEditing(row.original)}>
          <Pencil className="size-4" />
        </Button>
      );
    } },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={users}
        toolbar={<Button className="ml-auto rounded-full" onClick={() => setEditing({ isActive: true, roles: ["SALES_STAFF"] })}><Plus className="size-4" />{a.users.newUser}</Button>}
      />
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>{editing?.id ? editing.name : a.users.newUser}</DialogTitle></DialogHeader>
          {editing && (
            <UserForm
              initial={editing}
              isMe={editing.id === meId}
              roleOptions={roleOptions.filter((r) => iAmSuper || r.code !== "SUPER_ADMIN")}
              onDone={() => { setEditing(null); router.refresh(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserForm({ initial, isMe, roleOptions, onDone }: { initial: Partial<Row>; isMe: boolean; roleOptions: RoleOption[]; onDone: () => void }) {
  const { a } = useAdminText();
  const { pending, exec } = useServerAction();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<StaffUserInput>({
    resolver: zodResolver(staffUserSchema),
    defaultValues: { id: initial.id, name: initial.name ?? "", email: initial.email ?? "", phone: initial.phone ?? "", password: "", roles: initial.roles ?? [], isActive: initial.isActive ?? true },
  });
  const roles = watch("roles");
  const toggle = (code: string, on: boolean) => setValue("roles", on ? [...roles, code] : roles.filter((r) => r !== code), { shouldValidate: true });

  return (
    <form onSubmit={handleSubmit((v) => exec(() => saveStaffUser(v), { onSuccess: onDone }))} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={a.users.name} error={errors.name && a.errors.required}><Input {...register("name")} /></Field>
        <Field label={a.users.email} error={errors.email && a.errors.invalidEmail}><Input type="email" autoComplete="off" {...register("email")} /></Field>
        <Field label={`${a.users.phone} ${a.common.optional}`}><Input {...register("phone")} /></Field>
        <Field label={a.users.password} hint={a.users.passwordHint}><Input type="password" autoComplete="new-password" {...register("password")} /></Field>
      </div>
      <Field label={a.users.roles} error={errors.roles && a.errors.required}>
        <div className="grid grid-cols-2 gap-2">
          {roleOptions.map((r) => (
            <label key={r.code} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <Checkbox checked={roles.includes(r.code)} onCheckedChange={(v) => toggle(r.code, v === true)} />
              {r.label}
            </label>
          ))}
        </div>
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <Switch checked={watch("isActive")} disabled={isMe} onCheckedChange={(v) => setValue("isActive", v)} /> {a.common.active}
      </label>
      {isMe && <p className="text-xs text-muted-foreground">{a.users.selfWarning}</p>}
      <DialogFooter><Button type="submit" disabled={pending} className="rounded-full">{pending ? a.common.saving : a.common.save}</Button></DialogFooter>
    </form>
  );
}
