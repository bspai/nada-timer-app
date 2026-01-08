import { useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const emailRegex = /[^@]+@[^@]+/i;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!emailRegex.test(email)) {
      nextErrors.email = 'Enter a valid email';
    }
    if (password.length < 6) {
      nextErrors.password = 'Min. 6 characters';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsLoading(false);
    router.replace('/timer');
  };

  return (
    <LinearGradient colors={['#fefbf4', '#f1ede1']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.title}>Nada Timer</Text>
            <Text style={styles.subtitle}>Mindful focus companion</Text>

            <View style={styles.lotusWrapper}>
              <Image source={require('../assets/lotus.png')} style={styles.lotusImage} resizeMode="cover" />
            </View>

            <View style={styles.formGroup}>
              <TextInput
                placeholder="Email"
                placeholderTextColor="#a09382"
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <TextInput
                placeholder="Password"
                placeholderTextColor="#a09382"
                secureTextEntry
                style={[styles.input, errors.password && styles.inputError]}
                value={password}
                onChangeText={setPassword}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <Pressable style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
              <Text style={styles.buttonText}>{isLoading ? 'Signing in…' : 'Login'}</Text>
            </Pressable>

            <Text style={styles.footerText}>
              Don’t have an account?{' '}
              <Text style={styles.footerLink} onPress={() => {}}>
                Sign up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#f1ece1',
    borderRadius: 32,
    padding: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    shadowColor: '#6c8c85',
    shadowOffset: { width: 0, height: 35 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1d3557',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#7b8f94',
  },
  lotusWrapper: {
    height: 160,
    width: 160,
    marginVertical: 24,
    borderRadius: 80,
    overflow: 'hidden',
    backgroundColor: '#cbbfdc',
    shadowColor: '#aba0c9',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.45,
    shadowRadius: 25,
    elevation: 12,
  },
  lotusImage: {
    height: '100%',
    width: '100%',
  },
  formGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e1d8c9',
    backgroundColor: '#f7f1e5',
    paddingVertical: 14,
    paddingHorizontal: 22,
    fontSize: 16,
    color: '#5c5c5c',
  },
  inputError: {
    borderColor: '#e08a8a',
  },
  errorText: {
    color: '#c76868',
    fontSize: 12,
    paddingLeft: 18,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#4c7c7a',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  footerText: {
    color: '#1d3557',
    fontSize: 14,
  },
  footerLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
