import type { Metadata } from "next";
import { Big_Shoulders, Instrument_Sans, Instrument_Serif, Inter, JetBrains_Mono, Special_Elite } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["800", "900"],
});

const stamp = Special_Elite({
  variable: "--font-stamp",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "800", "900"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Precedent",
  description: "Teach a commodity code once. It remembers — for that broker only.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${stamp.variable} ${inter.variable} ${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* Browser extensions (e.g. Bitdefender's bis_* attributes) edit the page before hydration;
          that only causes console warnings, so use a clean browser profile for demos. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
