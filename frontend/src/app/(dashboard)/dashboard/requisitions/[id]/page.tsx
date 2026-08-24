import { redirect } from "next/navigation";

export default async function DashboardRequisitionDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/procurement/requisitions/${id}`);
}
