import "./globals.css";
import AppShell from "./components/AppShell";
import { ToastProvider } from "./components/Toast";

export const metadata = {
  title: "CampaignX | AI-Powered Campaign Management",
  description: "AI Multi-Agent System for Digital Marketing Campaign Automation - SuperBFSI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
