export default async function EditStrategyPage({ params }) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit Strategy</h1>
      <p className="text-sm text-muted-foreground">Strategy ID: {id}</p>
    </div>
  );
}
