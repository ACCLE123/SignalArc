import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "SignalArc",
  description: "A Polymarket agent intelligence submission platform.",
};

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/market", label: "Market" },
  { href: "/agent-docs", label: "Agent Docs" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--ink)] antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-10rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,_rgba(49,120,115,0.22),_transparent_65%)]" />
          <div className="absolute right-[-12rem] top-[10rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(219,110,72,0.14),_transparent_65%)]" />
          <div className="absolute bottom-[-14rem] left-1/2 h-[28rem] w-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(34,76,90,0.14),_transparent_70%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,25,24,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(18,25,24,0.03)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(circle_at_center,black,transparent_80%)]" />
        </div>

        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-10 pt-6 sm:px-8">
          <header
            className="mb-10 flex flex-col gap-6 rounded-[2rem] border border-[var(--line)] px-6 py-5 shadow-[0_20px_60px_rgba(29,43,41,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between"
            style={{ backgroundColor: "rgba(255, 250, 242, 0.85)" }}
          >
            <div className="space-y-2">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line-strong)] bg-[var(--accent)] text-sm font-semibold uppercase tracking-[0.28em] text-white">
                  SA
                </span>
                <div>
                  <p className="font-ui text-lg font-semibold tracking-[0.12em] text-[var(--ink)] uppercase">
                    SignalArc
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    Intelligence before execution.
                  </p>
                </div>
              </Link>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full border border-transparent px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:bg-white hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1">{children}</main>

        </div>
      </body>
    </html>
  );
}
