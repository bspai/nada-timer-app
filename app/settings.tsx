import { SafeAreaView, StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  return (
    <LinearGradient colors={['#fefbf4', '#f1ede1']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>This page will contain your preferences soon.</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4c7c7a',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1d3557',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#5c5c5c',
    textAlign: 'center',
  },
});
