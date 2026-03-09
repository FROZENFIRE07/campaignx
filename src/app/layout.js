import "./globals.css";

export const metadata = {
  title: "CampaignX | AI-Powered Campaign Management",
  description: "AI Multi-Agent System for Digital Marketing Campaign Automation - SuperBFSI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
