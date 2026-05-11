import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const ONBOARDING_DONE_KEY = 'onboarding_done';

export default function Index() {
  const [redirectTo, setRedirectTo] = useState<'/checkin' | '/onboarding' | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadOnboardingState = async () => {
      try {
        const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
        if (mounted) {
          setRedirectTo(done ? '/checkin' : '/onboarding');
        }
      } catch {
        if (mounted) {
          setRedirectTo('/onboarding');
        }
      }
    };

    loadOnboardingState();

    return () => {
      mounted = false;
    };
  }, []);

  if (!redirectTo) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={redirectTo} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
