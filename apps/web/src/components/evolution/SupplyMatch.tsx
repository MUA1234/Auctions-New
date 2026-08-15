'use client';
import { type FormEvent, useState } from 'react';
import { Button, Card, DataTable, Field, Skeleton, TextInput, type Column } from '@singha/ui';
import { Price } from './Price';
import { SignInPrompt } from '../../components/SignInPrompt';
import { useAuth } from '../../lib/auth';
import { recommendSupply, type SupplyRecommendation } from '../../lib/evolution-api';

/**
 * Supply match (E10 · buyer). A buyer describes what they need and gets a ranked, cheapest-first
 * list of matching supply programmes. This is a RECOMMENDATION only — explicitly non-binding
 * (`binding:false`): nothing is ordered automatically, no engine state changes. To transact the
 * buyer proceeds through a real offer/procurement flow, where the engine remains authoritative.
 */
export function SupplyMatch() {
  const { token, loading } = useAuth();
  const [category, setCategory] = useState('');
  const [product, setProduct] = useState('');
  const [quantityRequired, setQuantityRequired] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [results, setResults] = useState<SupplyRecommendation[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSearching(true);
    try {
      const res = await recommendSupply(
        {
          category: category.trim() || undefined,
          product: product.trim() || undefined,
          quantityRequired: quantityRequired.trim() || undefined,
          originCountry: originCountry.trim() || undefined,
        },
        token,
      );
      setResults(res.recommendations);
    } catch (err: unknown) {
      setResults(null);
      setError(err instanceof Error ? err.message : 'Could not fetch recommendations.');
    } finally {
      setSearching(false);
    }
  }

  if (loading) {
    return (
      <div className="container-page py-10 sm:py-14">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-6 h-56 w-full rounded-2xl" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container-page py-10 sm:py-14">
        <SignInPrompt
          title="Sign in to find supply"
          description="Describe what you need and we’ll recommend matching supply programmes — cheapest first. Nothing is ordered automatically."
          next="/wanted/supply"
        />
      </div>
    );
  }

  const columns: Column<SupplyRecommendation>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => <span className="font-medium text-bone">{r.product}</span>,
    },
    {
      key: 'origin',
      header: 'Origin',
      render: (r) => <span className="text-bone-300">{r.originCountry ?? '—'}</span>,
    },
    {
      key: 'price',
      header: 'Indicative price',
      align: 'right',
      render: (r) => <Price minor={r.indicativePriceMinor} />,
    },
    {
      key: 'lead',
      header: 'Lead time',
      align: 'right',
      render: (r) => (
        <span className="text-bone-300">
          {r.leadTimeDays != null ? `${r.leadTimeDays} days` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-2xl">
        <p className="eyebrow text-gold-300">Find supply</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-bone sm:text-4xl">
          Tell us what you need. See who can supply.
        </h1>
        <p className="mt-3 text-bone-400">
          We match your requirement to active supply programmes and rank them cheapest-first. This
          is a recommendation only — nothing is ordered automatically.
        </p>
      </header>

      <Card className="mt-8 p-6">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={search}>
          <Field label="Category" htmlFor="sm-category">
            <TextInput
              id="sm-category"
              placeholder="e.g. Beverages"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
          <Field label="Product" htmlFor="sm-product">
            <TextInput
              id="sm-product"
              placeholder="e.g. Ceylon tea"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </Field>
          <Field label="Quantity required" htmlFor="sm-qty">
            <TextInput
              id="sm-qty"
              inputMode="decimal"
              placeholder="e.g. 200"
              value={quantityRequired}
              onChange={(e) => setQuantityRequired(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </Field>
          <Field label="Origin country" htmlFor="sm-origin">
            <TextInput
              id="sm-origin"
              placeholder="e.g. LK"
              value={originCountry}
              onChange={(e) => setOriginCountry(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="primary" disabled={searching}>
              {searching ? 'Matching…' : 'Find supply'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? (
        <Card className="mt-6 text-center">
          <p className="text-sm text-outbid">{error}</p>
        </Card>
      ) : null}

      {results !== null ? (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-bone">Recommendations</h2>
            <span className="text-xs text-bone-500">
              {results.length} match{results.length === 1 ? '' : 'es'}
            </span>
          </div>
          <p className="mt-1 text-sm text-bone-500">
            Recommendation only — nothing is ordered automatically. Prices are indicative.
          </p>
          <Card className="mt-4 p-2">
            <DataTable
              columns={columns}
              rows={results}
              rowKey={(r) => r.programmeId}
              minWidth={480}
              empty="No matching supply programmes yet. Try broadening your criteria."
            />
          </Card>
        </section>
      ) : null}
    </div>
  );
}
