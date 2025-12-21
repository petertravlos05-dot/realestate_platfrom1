import { toast } from 'react-hot-toast';
import { Property } from '@prisma/client';

interface PropertyWithProgress extends Property {
  progress: {
    [key: string]: {
      status: string;
      [key: string]: any;
    };
  };
}

interface PropertyModalProps {
  property: PropertyWithProgress;
  onClose: () => void;
  onUpdate: (updatedProperty: PropertyWithProgress) => void;
}

const PropertyModal: React.FC<PropertyModalProps> = ({ property, onClose, onUpdate }) => {
  const handleProgressUpdate = async (stage: string, status: string) => {
    console.log('=== handleProgressUpdate START ===', {
      propertyId: property.id,
      stage,
      status,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch(`/api/admin/listings/${property.id}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage,
          status,
          message: `Το στάδιο ${stage} ενημερώθηκε σε ${status}`
        }),
      });

      console.log('Progress API Response:', {
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Progress update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update progress');
      }

      const data = await response.json();
      console.log('Progress update successful:', {
        data,
        timestamp: new Date().toISOString()
      });

      onUpdate({
        ...property,
        progress: {
          ...property.progress,
          [stage]: {
            ...property.progress[stage],
            status
          }
        }
      });

      console.log('=== handleProgressUpdate END ===', {
        propertyId: property.id,
        stage,
        status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error in handleProgressUpdate:', error);
      toast.error('Σφάλμα κατά την ενημέρωση της προόδου');
    }
  };

  const handleStatusChange = async (stage: string, newStatus: string) => {
    console.log('=== handleStatusChange START ===', {
      propertyId: property.id,
      stage,
      newStatus,
      timestamp: new Date().toISOString()
    });

    try {
      await handleProgressUpdate(stage, newStatus);
      console.log('Status change completed successfully');
    } catch (error) {
      console.error('❌ Error in handleStatusChange:', error);
      toast.error('Σφάλμα κατά την αλλαγή της κατάστασης');
    }
  };

  return (
    <div>
      {/* Your existing JSX here */}
    </div>
  );
};

export default PropertyModal; 