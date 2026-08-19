import { redirect } from 'next/navigation';

/**
 * The separate buyer "dashboard" is unified into the one Singha Cockpit (unified-identity pass):
 * a single Client sees buying, selling, procurement, supply and account health in one adaptive
 * place, with no Buyer/Seller split. This route now points there so existing links keep working.
 */
export default function DashboardRedirect() {
  redirect('/cockpit');
}
