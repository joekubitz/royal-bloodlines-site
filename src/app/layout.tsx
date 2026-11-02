import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Royals Bloodline",
  description: "Premium Creator Agency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="bg-black text-white"
        style={
          {
            "--font-cinzel": "Georgia, 'Times New Roman', serif",
            "--font-inter": "Arial, Helvetica, sans-serif",
          } as React.CSSProperties
        }
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
