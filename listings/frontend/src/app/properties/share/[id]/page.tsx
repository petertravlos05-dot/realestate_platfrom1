import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PropertyConnectionClient } from '@/components/PropertyConnectionClient';

export default async function SharePropertyPage({ params }: { params: { id: string } }) {
  try {
    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!property) {
      notFound();
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Σύνδεση με τον Agent
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Ο {property.user.name} σας προτείνει το ακίνητο:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-xl font-semibold">{property.title}</h3>
              <p className="text-gray-600">{property.city}, {property.street} {property.number}</p>
              <p className="text-gray-900 font-medium">
                {new Intl.NumberFormat('el-GR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(property.price)}
              </p>
            </div>
          </div>

          <PropertyConnectionClient
            agentId={property.user.id}
            propertyId={property.id}
            agentName={property.user.name}
            propertyTitle={property.title}
            propertyImage={property.images?.[0] || ''}
            propertyLocation={`${property.city}, ${property.street} ${property.number}`}
            propertyPrice={property.price}
            agentEmail={property.user.email || ''}
            agentPhone={property.user.phone || ''}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching property:', error);
    notFound();
  }
} 