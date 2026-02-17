import './globals.css';
import Link from 'next/link';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html><body><nav className='p-3 bg-white border-b flex gap-4'><Link href='/tasks'>Tasks</Link><Link href='/profile'>Profile</Link><Link href='/wallet'>Wallet</Link><Link href='/admin'>Admin</Link></nav>{children}</body></html>;
}
