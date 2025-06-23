// src/app/page.tsx
import ScrapeForm from '@/components/ScrapeForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Lottery Results Scraper For Dad
          </h1>
        </div>
        
        <ScrapeForm />
        
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            <strong>Supported Sites:</strong> The Lott (Australia), and other lottery sites with similar structures.
          </p>
        </div>
      </div>
    </main>
  );
}