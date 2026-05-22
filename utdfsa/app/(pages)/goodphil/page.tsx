import Link from 'next/link'

export default function GoodphilPage() {
  return (
    <main>
      <h1>Goodphil</h1>
      <nav>
        <Link href="/goodphil/cultural">Cultural</Link>
        <Link href="/goodphil/modern">Modern</Link>
        <Link href="/goodphil/spirit">Spirit</Link>
        <Link href="/goodphil/sports">Sports</Link>
      </nav>
    </main>
  )
}