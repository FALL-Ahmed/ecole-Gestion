import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import apiClient from '@/lib/apiClient';

interface EstablishmentInfoContextType {
  schoolName: string;
  address: string;
  phone: string;
  website: string;
  fetchEstablishmentInfo: () => Promise<void>;
}

const EstablishmentInfoContext = createContext<EstablishmentInfoContextType | undefined>(
  undefined
);

// Default values for initial state
const DEFAULT_SCHOOL_NAME = 'Chargement...';
const DEFAULT_ADDRESS = 'Chargement...';
const DEFAULT_PHONE = '';
const DEFAULT_WEBSITE = '';

interface EstablishmentInfoProviderProps {
  children: ReactNode;
}

export const EstablishmentInfoProvider: React.FC<EstablishmentInfoProviderProps> = ({
  children,
}) => {
  const [schoolName, setSchoolName] = useState(DEFAULT_SCHOOL_NAME);
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [website, setWebsite] = useState(DEFAULT_WEBSITE);

  const fetchEstablishmentInfo = useCallback(async () => {
    try {
      const response = await apiClient.get('/establishment-info');
      if (response.data && response.data.schoolName) {
        setSchoolName(response.data.schoolName);
        setAddress(response.data.address || 'Adresse inconnue');
        setPhone(response.data.phone || '');
        setWebsite(response.data.website || '');
      } else {
        setSchoolName('Nom de l\'école inconnu');
        setAddress('Adresse inconnue');
        setPhone('');
        setWebsite('');
      }
    } catch (error: any) {
      // Use a more specific error message if available from the API response
      console.error('Error fetching establishment info:', error.response?.data?.message || error.message);
      setSchoolName('Erreur de chargement');
      setAddress('Erreur de chargement');
      setPhone('');
      setWebsite('');
    }
  }, []);

  useEffect(() => {
    fetchEstablishmentInfo();
  }, [fetchEstablishmentInfo]);

  return ( // Pass all state variables in the value prop
    <EstablishmentInfoContext.Provider value={{ schoolName, address, phone, website, fetchEstablishmentInfo }}>
      {children}
    </EstablishmentInfoContext.Provider>
  );
};

export const useEstablishmentInfo = () => {
  const context = useContext(EstablishmentInfoContext);
  if (context === undefined) {
    throw new Error('useEstablishmentInfo must be used within an EstablishmentInfoProvider');
  }
  return context;
};
