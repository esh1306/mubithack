import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Precedent",
  description: "Customs codes that learn from your own corrections.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Bitdefender's extension stamps bis_* attributes onto the page before React hydrates,
            which React reports as a hydration mismatch. Strip them as they appear. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var a=["bis_skin_checked","bis_register","__processed_"];function c(n){if(n.nodeType!==1)return;for(var i=0;i<a.length;i++)n.removeAttribute(a[i]);var k=n.querySelectorAll("[bis_skin_checked],[bis_register]");for(var j=0;j<k.length;j++)for(var i=0;i<a.length;i++)k[j].removeAttribute(a[i]);}new MutationObserver(function(m){for(var i=0;i<m.length;i++){c(m[i].target);for(var j=0;j<m[i].addedNodes.length;j++)c(m[i].addedNodes[j]);}}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:["bis_skin_checked","bis_register"]});})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
