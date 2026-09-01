'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flag, ArrowRight } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MEMBER' | 'VIEWER'>('OWNER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-8 w-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100">
            <Flag className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Create FeatureFlow Account</h1>
          <p className="text-xs text-zinc-400">Initialize team access and environment keys</p>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />

          <Input
            label="Work email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Select
            label="Account Role"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            options={[
              { label: 'Owner (Full Admin Access)', value: 'OWNER' },
              { label: 'Member (Manage Flags & Experiments)', value: 'MEMBER' },
              { label: 'Viewer (Read-Only)', value: 'VIEWER' },
            ]}
          />

          <Button type="submit" disabled={loading} className="w-full mt-2" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            {loading ? 'Creating Account...' : 'Register Account'}
          </Button>
        </form>

        <div className="text-center text-xs text-zinc-500 border-t border-zinc-900 pt-4">
          Already registered?{' '}
          <Link href="/login" className="text-zinc-300 hover:text-white font-medium underline underline-offset-4">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
