import { NextResponse } from 'next/server';

const mockLocations = [
  'Αθήνα',
  'Αθήνα, Κολωνάκι',
  'Αθήνα, Παγκράτι',
  'Αθήνα, Γλυφάδα',
  'Θεσσαλονίκη',
  'Θεσσαλονίκη, Καλαμαριά',
  'Θεσσαλονίκη, Τούμπα',
  'Πάτρα',
  'Ηράκλειο',
  'Λάρισα',
  'Βόλος',
  'Ιωάννινα',
  'Χανιά',
  'Καβάλα',
  'Λαμία'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  if (query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = mockLocations.filter(location => 
    location.toLowerCase().includes(query)
  );

  return NextResponse.json({ suggestions });
} 