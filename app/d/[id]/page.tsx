import DashboardView from "@/components/DashboardView";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DashboardView id={id} />;
}
