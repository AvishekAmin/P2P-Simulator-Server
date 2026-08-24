import { redirect } from "next/navigation";

export default function DashboardRequisitionsRedirect() {
  redirect("/procurement/requisitions");
}
