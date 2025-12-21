import { useNotifications } from '@/contexts/NotificationContext';
import { apiClient } from '@/lib/api/client';

export const createSellerNotification = async (
  type: 'SELLER_INTEREST' | 'SELLER_APPOINTMENT' | 'SELLER_OFFER' | 'SELLER_TRANSACTION' | 'SELLER_GENERAL',
  message: string,
  metadata?: {
    propertyId?: string;
    appointmentId?: string;
    leadId?: string;
    transactionId?: string;
    recipient?: 'seller';
    [key: string]: any;
  },
  title?: string
) => {
  try {
    const { data } = await apiClient.post('/notifications/seller', {
      type,
      message,
      metadata: {
        ...metadata,
        recipient: 'seller'
      },
      title,
    });

    return data;
  } catch (error) {
    console.error('Error creating seller notification:', error);
    throw error;
  }
};

export const createSellerInterestNotification = async (
  propertyId: string,
  buyerName: string,
  propertyTitle: string
) => {
  return createSellerNotification(
    'SELLER_INTEREST',
    `Ο χρήστης ${buyerName} ενδιαφέρθηκε για το ακίνητό σας "${propertyTitle}"`,
    {
      propertyId,
      buyerName,
      propertyTitle,
    },
    'Νέο Ενδιαφέρον'
  );
};

export const createSellerAppointmentNotification = async (
  appointmentId: string,
  buyerName: string,
  propertyTitle: string,
  date: string,
  time: string
) => {
  return createSellerNotification(
    'SELLER_APPOINTMENT',
    `Δημιουργήθηκε νέο ραντεβού για το ακίνητό σας "${propertyTitle}" με τον χρήστη ${buyerName} στις ${date} στις ${time}`,
    {
      appointmentId,
      buyerName,
      propertyTitle,
      date,
      time,
    },
    'Νέο Ραντεβού'
  );
};

export const createSellerOfferNotification = async (
  leadId: string,
  buyerName: string,
  propertyTitle: string,
  offerAmount: number
) => {
  return createSellerNotification(
    'SELLER_OFFER',
    `Ο χρήστης ${buyerName} έκανε προσφορά €${offerAmount.toLocaleString()} για το ακίνητό σας "${propertyTitle}"`,
    {
      leadId,
      buyerName,
      propertyTitle,
      offerAmount,
    },
    'Νέα Προσφορά'
  );
};

export const createSellerTransactionNotification = async (
  transactionId: string,
  propertyTitle: string,
  stage: string,
  message: string
) => {
  return createSellerNotification(
    'SELLER_TRANSACTION',
    message,
    {
      transactionId,
      propertyTitle,
      stage,
    },
    'Ενημέρωση Συναλλαγής'
  );
};

export const createSellerGeneralNotification = async (
  message: string,
  title?: string,
  metadata?: any
) => {
  return createSellerNotification(
    'SELLER_GENERAL',
    message,
    metadata,
    title
  );
}; 