import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas",
  description: "RAG-powered Q&A assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#F85AA4",
          colorBackground: "#0a0a0f",
          colorInputBackground: "rgba(255, 255, 255, 0.08)",
          colorInputText: "#ffffff",
          borderRadius: "12px",
        },
        elements: {
          card: "glass-strong",
          formButtonPrimary: "btn-glow",
        },
      }}
    >
      <html lang="en">
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
