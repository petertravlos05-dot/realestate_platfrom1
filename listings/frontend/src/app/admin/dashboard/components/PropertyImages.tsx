import Image from 'next/image';
import { FiUpload } from 'react-icons/fi';

interface PropertyImagesProps {
  images: string[];
  onUpload: (files: FileList) => void;
}

export default function PropertyImages({ images, onUpload }: PropertyImagesProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
    }
  };

  return (
    <div>
      <h3 className="font-medium mb-2">Φωτογραφίες</h3>
      <div className="grid grid-cols-4 gap-4">
        {images?.map((image: string, index: number) => (
          <div key={index} className="relative aspect-square">
            <Image
              src={image}
              alt={`Property image ${index + 1}`}
              fill
              className="object-cover rounded"
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiUpload className="mr-2" />
          Προσθήκη φωτογραφιών
        </label>
      </div>
    </div>
  );
} 