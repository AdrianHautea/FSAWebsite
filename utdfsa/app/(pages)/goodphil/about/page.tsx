import Link from 'next/link'

// ============================================================
// UI — safe to restyle everything below this line
// no data fetching — this page is fully static
// change classnames, layout, colors, and typography freely
// do not remove or rename Link href values
// ============================================================
export default function AboutGoodphilPage() {
  const branches = [
    { href: '/goodphil/cultural', label: 'Cultural', description: 'Traditional Filipino arts, dance, and heritage.' },
    { href: '/goodphil/modern', label: 'Modern', description: 'Contemporary and fusion performance styles.' },
    { href: '/goodphil/spirit', label: 'Spirit', description: 'Hype, cheering, and school spirit.' },
    { href: '/goodphil/sports', label: 'Sports', description: 'Athletic competitions and recreational sports.' },
  ]

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-3">About Goodphil</h1>
      <p className="text-gray-600 leading-relaxed mb-8">
        Goodphil is UTD FSA&apos;s performance and activities program, offering members a way to
        get involved, showcase their talents, and represent the organization. Members can join one
        or more branches based on their interests.
      </p>

      <h2 className="text-lg font-semibold text-gray-800 mb-4">Branches</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {branches.map(b => (
          <Link
            key={b.href}
            href={b.href}
            className="block border rounded-xl p-5 bg-white shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
          >
            <p className="font-semibold text-gray-900 mb-1">{b.label}</p>
            <p className="text-sm text-gray-500">{b.description}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}
