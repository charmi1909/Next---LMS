// src/app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Library Management System",
  description: "A modern LMS built with Next.js 14 and MongoDB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
