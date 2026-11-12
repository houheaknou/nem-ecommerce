import { PageHeader } from "@/components/admin/page-header";
import { pageGuard } from "@/features/auth/guard";
import { listPendingWholesale } from "@/features/customers/queries";
import { getI18n } from "@/i18n/server";
import { WholesaleQueue } from "./wholesale-queue";

export default async function WholesalePage() {
  await pageGuard("wholesale.approve");
  const [{ a }, pending] = await Promise.all([getI18n(), listPendingWholesale()]);
  return (
    <>
      <PageHeader title={a.wholesale.queue} description={String(pending.length)} />
      <WholesaleQueue items={pending} />
    </>
  );
}
