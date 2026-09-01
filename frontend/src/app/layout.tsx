import './globals.css';
import Providers from '../lib/providers';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'FeatureFlow - Feature Flag & Experimentation Platform',
  description: 'Safely release features, manage targeted rollouts, and run A/B experiments without redeploying code.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 px-6 py-8 mx-auto max-w-7xl w-full">
            {children}
          </main>
          <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
            FeatureFlow Platform • Production Monolith Edition
          </footer>
        </Providers>
      </body>
    </html>
  );
}
