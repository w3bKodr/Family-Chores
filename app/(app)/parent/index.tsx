import React from 'react';
import { useRouter } from 'expo-router';

export default function ParentScreenIndex() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/(app)/parent/dashboard');
  }, []);

  return null;
}
