import Navbar from "./_components/navbar";

export default function AppLayout({ children }) {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
