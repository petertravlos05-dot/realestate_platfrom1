'use client';

interface DescriptionTabProps {
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export default function DescriptionTab({ formData, onChange }: DescriptionTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Περιγραφή ακινήτου *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          rows={8}
          placeholder="Περιγράψτε το ακίνητο με λεπτομέρειες. Συμπεριλάβετε σημαντικές πληροφορίες όπως την κατάσταση του ακινήτου, πρόσφατες ανακαινίσεις, θέα, προσανατολισμό, κλπ."
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-2 text-sm text-gray-500">
          Μια καλή περιγραφή βοηθά τους ενδιαφερόμενους να κατανοήσουν καλύτερα το ακίνητό σας.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Τίτλος καταχώρησης *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={onChange}
          placeholder="π.χ. Μοντέρνο διαμέρισμα με θέα στη θάλασσα"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-2 text-sm text-gray-500">
          Ένας ελκυστικός τίτλος αυξάνει το ενδιαφέρον για την καταχώρησή σας.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Λέξεις-κλειδιά
        </label>
        <input
          type="text"
          name="keywords"
          value={formData.keywords}
          onChange={onChange}
          placeholder="π.χ. ανακαινισμένο, φωτεινό, κεντρικό, ήσυχο"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-2 text-sm text-gray-500">
          Προσθέστε λέξεις-κλειδιά χωρισμένες με κόμμα για καλύτερη εμφάνιση στα αποτελέσματα αναζήτησης.
        </p>
      </div>
    </div>
  );
} 