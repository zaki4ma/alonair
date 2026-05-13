import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function WebRootLayout() {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
