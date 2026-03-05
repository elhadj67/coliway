import { useLocalSearchParams } from 'expo-router';
import LegalScreen from '../../components/LegalScreen';
import { LegalType } from '../../constants/legalContent';

export default function AuthLegalScreen() {
  const { type } = useLocalSearchParams<{ type: LegalType }>();
  return <LegalScreen type={type || 'cgu'} />;
}
