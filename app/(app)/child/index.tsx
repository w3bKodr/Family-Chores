import React from 'react';
import { useRouter } from 'expo-router';

export default function ChildScreenIndex() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/(app)/child/today');
  }, []);

  return null;
}
