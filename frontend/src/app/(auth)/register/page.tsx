'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiMail, FiLock, FiPhone, FiHash, FiMapPin } from 'react-icons/fi';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: string;
  phone?: string;
  companyName?: string;
  licenseNumber?: string;
  businessAddress?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'BUYER',
    phone: '',
    companyName: '',
    licenseNumber: '',
    businessAddress: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Το email είναι υποχρεωτικό';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Μη έγκυρη διεύθυνση email';
    }

    if (!formData.password) {
      newErrors.password = 'Ο κωδικός είναι υποχρεωτικός';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Η επιβεβαίωση κωδικού είναι υποχρεωτική';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Οι κωδικοί δεν ταιριάζουν';
    }

    if (!formData.name) {
      newErrors.name = 'Το όνομα είναι υποχρεωτικό';
    }

    if (!formData.role) {
      newErrors.role = 'Ο ρόλος είναι υποχρεωτικός';
    }

    // Role-specific validations
    if (formData.role === 'SELLER' && !formData.phone) {
      newErrors.phone = 'Το τηλέφωνο είναι υποχρεωτικό για τους πωλητές';
    }

    if (formData.role === 'AGENT') {
      if (!formData.phone) {
        newErrors.phone = 'Το τηλέφωνο είναι υποχρεωτικό για τους μεσίτες';
      }
      if (!formData.licenseNumber) {
        newErrors.licenseNumber = 'Ο αριθμός άδειας είναι υποχρεωτικός για τους μεσίτες';
      }
      if (!formData.companyName) {
        newErrors.companyName = 'Το όνομα εταιρείας είναι υποχρεωτικό για τους μεσίτες';
      }
      if (!formData.businessAddress) {
        newErrors.businessAddress = 'Η διεύθυνση επιχείρησης είναι υποχρεωτική για τους μεσίτες';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Σφάλμα κατά την εγγραφή');
      }

      // Clear form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        role: 'BUYER',
        phone: '',
        companyName: '',
        licenseNumber: '',
        businessAddress: ''
      });

      // Redirect to login
      router.push('/login?registered=true');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Σφάλμα κατά την εγγραφή');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Δημιουργία λογαριασμού
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {submitError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{submitError}</div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="role" className="sr-only">Ρόλος</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
              >
                <option value="BUYER">Αγοραστής</option>
                <option value="SELLER">Πωλητής</option>
                <option value="AGENT">Μεσίτης</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>

            <div>
              <label htmlFor="name" className="sr-only">Όνομα</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser size={20} />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Όνομα"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail size={20} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Κωδικός</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock size={20} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Κωδικός"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">Επιβεβαίωση κωδικού</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock size={20} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Επιβεβαίωση κωδικού"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {(formData.role === 'SELLER' || formData.role === 'AGENT') && (
              <div>
                <label htmlFor="phone" className="sr-only">Τηλέφωνο</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone size={20} />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                    placeholder="Τηλέφωνο"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            )}

            {formData.role === 'AGENT' && (
              <>
                <div>
                  <label htmlFor="companyName" className="sr-only">Όνομα εταιρείας</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiHash size={20} />
                    </div>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                        errors.companyName ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                      placeholder="Όνομα εταιρείας"
                    />
                  </div>
                  {errors.companyName && (
                    <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="licenseNumber" className="sr-only">Αριθμός άδειας</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiHash size={20} />
                    </div>
                    <input
                      id="licenseNumber"
                      name="licenseNumber"
                      type="text"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                        errors.licenseNumber ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                      placeholder="Αριθμός άδειας"
                    />
                  </div>
                  {errors.licenseNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="businessAddress" className="sr-only">Διεύθυνση επιχείρησης</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMapPin size={20} />
                    </div>
                    <input
                      id="businessAddress"
                      name="businessAddress"
                      type="text"
                      value={formData.businessAddress}
                      onChange={handleChange}
                      className={`appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border ${
                        errors.businessAddress ? 'border-red-300' : 'border-gray-300'
                      } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                      placeholder="Διεύθυνση επιχείρησης"
                    />
                  </div>
                  {errors.businessAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessAddress}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isLoading ? 'Εγγραφή...' : 'Εγγραφή'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Έχετε ήδη λογαριασμό;{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Σύνδεση
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 