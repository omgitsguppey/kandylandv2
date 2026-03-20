export default function AdminLoading() {
  return (
    <div className="w-full flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-white/10 border-t-brand-purple animate-spin" />
        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">
          Loading Data Streams...
        </p>
      </div>
    </div>
  );
}
