import Link from 'next/link';
import { PhotoUploader } from '@/components/walkthroughs/photo-uploader';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default async function WalkthroughUploadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Link href={`/properties/${id}/walkthrough`}>
        <Button variant="ghost" size="sm" className="mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to walkthroughs
        </Button>
      </Link>

      <h1 className="text-3xl font-bold mb-2">New 3D Walkthrough</h1>
      <p className="text-muted-foreground mb-2">
        Upload 30–500 phone photos walking through the property.
      </p>

      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 mb-8 text-sm text-blue-900 space-y-1">
        <p className="font-medium">Best results:</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-800">
          <li>Walk slowly, keeping each shot ~70–80% overlapped with the previous</li>
          <li>Capture multiple heights (low / chest / overhead) in each room</li>
          <li>Good lighting; avoid direct sun-spots and dark corners</li>
          <li>Avoid mirrors and reflective glass when possible</li>
          <li>150+ photos for a 2,000 sq ft home produces the best 3D model</li>
        </ul>
      </div>

      <PhotoUploader propertyId={id} />
    </div>
  );
}
