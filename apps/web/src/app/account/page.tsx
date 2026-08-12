import type { Metadata } from 'next';
import Link from 'next/link';
import { MemberArea } from '../../components/member/MemberArea';

export const metadata: Metadata = {
  title: 'My membership · Singha Auctions',
  description: 'Your Singha Client ID, membership, Bid Capacity and security.',
};

export default function AccountPage() {
  return (
    <div className="container-page py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-bone">My membership</h1>
          <p className="mt-2 text-bone-400">
            Your Singha Member Passport, Bid Capacity and security — all in one place.
          </p>
        </div>
        <Link
          href="/account/security"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-bone-300 hover:border-white/20"
        >
          Security settings
        </Link>
      </div>
      <MemberArea />
    </div>
  );
}
