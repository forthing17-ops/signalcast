import { Suspense } from 'react';
import { KnowledgeDashboard } from '@/components/knowledge/KnowledgeDashboard';
import { RefreshCw } from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center space-x-2">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span>Loading knowledge dashboard...</span>
      </div>
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<LoadingSpinner />}>
        <KnowledgeDashboard />
      </Suspense>
    </div>
  );
}

export const metadata = {
  title: 'Knowledge Dashboard | BMAD News',
  description: 'Track your learning progress and discover knowledge gaps',
};