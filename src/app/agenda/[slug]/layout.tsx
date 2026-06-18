export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] px-4 py-6">
      {children}
    </div>
  );
}
