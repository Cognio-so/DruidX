"use client";

import AdminErrorBoundary from "./_components/error-boundary";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminErrorBoundary error={error} reset={reset} />;
}
