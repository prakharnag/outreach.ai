export default function Loading() {
  return (
    <div className="min-h-screen gradient-blue flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-white mb-2">Loading...</h1>
        <p className="text-blue-100">Preparing your outreach workspace</p>
      </div>
    </div>
  );
}       