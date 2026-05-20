import "./globals.css";
import Link from "next/link";
import { MetaMaskProvider } from "@/components/metamask-context";
import MetaMaskConnect from "@/components/metamask-connect";
import SiteNavigation from "@/components/site-navigation";

export const metadata = {
  title: "SignalArc",
  description: "A Polymarket agent intelligence submission platform.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/market", label: "Market" },
  { href: "/agent-docs", label: "Agent Docs" },
];

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen antialiased">
        <MetaMaskProvider>
          <div className="divider-grid min-h-screen">
            <div className="mx-auto flex min-h-screen w-full max-w-[1380px] flex-col px-5 pb-12 pt-5 sm:px-8">
              <header className="shell-card sticky top-4 z-30 mb-10 rounded-[1.75rem] px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between xl:flex-1">
                    <Link href="/" className="inline-flex items-center gap-3">
                      <span className="brand-mark inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold uppercase tracking-[0.22em] text-white">
                        SA
                      </span>
                      <div>
                        <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--ink)]">SignalArc</p>
                        <p className="text-sm text-[var(--muted)]">Prediction-market research intake</p>
                      </div>
                    </Link>

                    <SiteNavigation navigation={navigation} />
                  </div>

                  <MetaMaskConnect />
                </div>
              </header>

              <main className="flex-1">{children}</main>
            </div>
          </div>
        </MetaMaskProvider>
      </body>
    </html>
  );
}
