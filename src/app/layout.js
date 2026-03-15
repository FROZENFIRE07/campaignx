import "./globals.css";
import AppShell from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import ThemeProvider from "./components/ThemeProvider";

export const metadata = {
  title: "CampaignX | AI-Powered Campaign Management",
  description: "AI Multi-Agent System for Digital Marketing Campaign Automation - SuperBFSI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Sora:wght@700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

