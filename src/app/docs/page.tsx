import { WorkspaceApp } from "@/components/WorkspaceApp";

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  return <WorkspaceApp initialDemo={params.demo} />;
}
