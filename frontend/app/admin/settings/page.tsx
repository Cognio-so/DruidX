import SettingsUI from "./_component/settings-ui";

interface PageProps {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}

export default async function Settings({ searchParams }: PageProps) {
  const params = await searchParams;
  
  return (
    <>
      {params.success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-4">
          {params.success}
        </div>
      )}
      {params.error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
          {params.error}
        </div>
      )}
      <SettingsUI />
    </>
  );
}