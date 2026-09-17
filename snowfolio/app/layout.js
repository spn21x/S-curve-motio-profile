import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Snowfolio — Dividend Snowball Tracker",
  description: "Track your US dividend portfolio and project the snowball.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="brand">
            <span className="logo">❄️</span>
            <span>Snowfolio</span>
          </div>
          <nav>
            <Link href="/">Dashboard</Link>
            <Link href="/calendar">Calendar</Link>
            <Link href="/transactions">Transactions</Link>
          </nav>
        </header>
        <main className="container">{children}</main>
        <footer className="foot">
          Data from Yahoo Finance · for personal/educational use
        </footer>
      </body>
    </html>
  );
}
