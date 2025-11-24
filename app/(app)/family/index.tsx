import React from 'react';
import { useRouter } from 'expo-router';

export default function FamilyScreenIndex() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/(app)/family/manage');
  }, []);

  return null;
}
