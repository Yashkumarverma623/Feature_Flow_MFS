import './globals.css';
import Providers from '../lib/providers';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'FeatureFlow — Control Plane',
  description: 'Production feature management and experimentation control plane.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1 px-4 py-6 mx-auto max-w-7xl w-full">
            {children}
          </main>
          <footer className="border-t border-zinc-900 py-4 px-4 text-center text-[11px] text-zinc-500 font-mono">
            FeatureFlow Control Plane • Enterprise v1.0
          </footer>
        </Providers>
      </body>
    </html>
  );
}
