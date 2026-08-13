import type { Metadata } from 'next';
import { AccountNav } from '../../components/AccountNav';
import { MemberArea } from '../../components/member/MemberArea';

export const metadata: Metadata = {
  title: 'My membership · Singha Auctions',
  description: 'Your Singha Client ID, membership, Bid Capacity and security.',
};

export default function AccountPage() {
  return (
    <div className="container-page py-14">
      <h1 className="font-serif text-4xl font-bold text-bone">My account</h1>
      <p className="mt-2 text-bone-400">
        Your Singha Member Passport, Bid Capacity, activity and security — all in one place.
      </p>
      <AccountNav />
      <div className="mt-8">
        <MemberArea />
      </div>
    </div>
  );
}
