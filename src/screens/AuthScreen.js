import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, ActivityIndicator, 
  useColorScheme, LayoutAnimation, UIManager,
  Image, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../context/UserContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AuthScreen = () => {
  const theme = useColorScheme() || 'light';
  const isDark = theme === 'dark';
  
  const bg = isDark ? '#000000' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#000000';
  const inputBg = isDark ? '#1C1C1E' : '#F2F2F7';
  const inputPlaceholder = isDark ? '#8E8E93' : '#AEAEB2';
  const accent = '#FF3B30';

  const { login, register } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Tracks fields with errors (empty or invalid) for red highlighting
  const [errorFields, setErrorFields] = useState([]); 

  const handleGooglePress = () => {
    Alert.alert(
      "Google Sign-In Disabled", 
      "Google Sign-In is temporarily disabled while running in Expo Go to prevent native module crashes. Please use Email/Password to test the app."
    );
  };

  const toggleAuthMode = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
    setErrorFields([]); 
  };

  const handleTextChange = (setter, fieldName) => (val) => {
    setter(val);
    if (errorFields.includes(fieldName)) {
      setErrorFields(prev => prev.filter(f => f !== fieldName));
    }
  };

  const handleAuth = async () => {
    // 1. Empty Field Validation
    const missing = [];
    if (!email) missing.push('email');
    if (!password) missing.push('password');
    if (!isLogin && !confirmPassword) missing.push('confirmPassword');

    if (missing.length > 0) {
      setErrorFields(missing);
      Alert.alert("Required", "Please fill in all highlighted fields.");
      return;
    }

    // 2. Input Limit Validations (Applies to both Login and Register based on test cases)
    if (email.length > 254) {
      setErrorFields(['email']);
      Alert.alert("Email too long", "Email cannot exceed 254 characters.");
      return;
    }

    if (password.length > 128) {
      setErrorFields(['password']);
      Alert.alert("Password too long", "Password cannot exceed 128 characters.");
      return;
    }

    if (password.length < 6) {
      setErrorFields(['password']);
      Alert.alert("Password too short", "Password must be at least 6 characters long.");
      return;
    }

    // 3. Formatting & Security Validations (Registration Only)
    if (!isLogin) {
      // Strict regex ensuring standard characters and a valid 2+ letter extension (.com, .org, .co.uk)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        setErrorFields(['email']);
        Alert.alert("Invalid Email", "Please enter a valid email address format (e.g., name@domain.com).");
        return;
      }

      const domain = email.split('@')[1]?.toLowerCase();
      const localPart = email.split('@')[0];

      // Block known disposable/spam email providers
      const blockedDomains = [
        'mailinator.com', 'yopmail.com', 'tempmail.com', 
        '10minutemail.com', 'guerrillamail.com', 'trashmail.com'
      ];
      
      if (blockedDomains.includes(domain)) {
        setErrorFields(['email']);
        Alert.alert("Email Blocked", "Disposable or temporary email addresses are not allowed.");
        return;
      }

      // Fake Gmail Detection
      if (domain === 'gmail.com') {
        // Block alias trick (e.g. user+spam@gmail.com)
        if (localPart.includes('+')) {
          setErrorFields(['email']);
          Alert.alert("Invalid Gmail", "Gmail aliases (using '+') are not allowed for registration.");
          return;
        }
        
        // Gmail rules: 6-30 characters, no starting/ending/consecutive periods
        const alphanumericPart = localPart.replace(/\./g, '');
        if (alphanumericPart.length < 6 || alphanumericPart.length > 30) {
          setErrorFields(['email']);
          Alert.alert("Invalid Gmail", "A standard Gmail address must be between 6 and 30 characters long.");
          return;
        }

        if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
          setErrorFields(['email']);
          Alert.alert("Invalid Gmail", "Gmail addresses cannot start, end, or contain consecutive periods.");
          return;
        }
      }

      if (password !== confirmPassword) {
        setErrorFields(['password', 'confirmPassword']);
        Alert.alert("Password Mismatch", "Passwords do not match. Please try again.");
        return;
      }
    }

    setLoading(true);
    let result;
    
    if (isLogin) {
      result = await login(email, password);
      setLoading(false);
      if (!result.success) {
        setErrorFields(['email', 'password']);
        Alert.alert("Sign In Failed", "Invalid email or password.");
      }
    } else {
      result = await register(email, password);
      setLoading(false);
      if (!result.success) {
        let errorMsg = result.error;
        if (errorMsg.includes('email-already-in-use')) {
          errorMsg = "This email is already registered.";
          setErrorFields(['email']);
        }
        else if (errorMsg.includes('invalid-email')) {
          errorMsg = "Please enter a valid email address.";
          setErrorFields(['email']);
        }
        else {
          errorMsg = "An error occurred during registration. Please try again.";
        }
        
        Alert.alert("Registration Failed", errorMsg);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          
          <View style={styles.header}>
            <View style={[
              styles.iconShadow, 
              { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
            ]}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.appIcon}
                resizeMode="cover" 
              />
            </View>
            
            <Text style={[styles.title, { color: text }]}>
              {isLogin ? 'Welcome back.' : 'Join UFitness.'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Sign in to continue your progress.' : 'Create an account to start tracking.'}
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: inputBg, color: text },
                errorFields.includes('email') && { borderWidth: 1, borderColor: accent }
              ]}
              placeholder="Email"
              placeholderTextColor={inputPlaceholder}
              value={email}
              onChangeText={handleTextChange(setEmail, 'email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={254}
            />

            <TextInput
              style={[
                styles.input, 
                { backgroundColor: inputBg, color: text },
                errorFields.includes('password') && { borderWidth: 1, borderColor: accent }
              ]}
              placeholder="Password"
              placeholderTextColor={inputPlaceholder}
              value={password}
              onChangeText={handleTextChange(setPassword, 'password')}
              secureTextEntry
              maxLength={128}
            />

            {!isLogin && (
              <>
                <TextInput
                  style={[
                    styles.input, 
                    { backgroundColor: inputBg, color: text },
                    errorFields.includes('confirmPassword') && { borderWidth: 1, borderColor: accent }
                  ]}
                  placeholder="Confirm Password"
                  placeholderTextColor={inputPlaceholder}
                  value={confirmPassword}
                  onChangeText={handleTextChange(setConfirmPassword, 'confirmPassword')}
                  secureTextEntry
                  maxLength={128}
                />
                <Text style={styles.requirementText}>
                  * Password must be at least 6 characters
                </Text>
              </>
            )}

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: accent }]} 
              onPress={handleAuth}
              activeOpacity={0.8}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={[styles.line, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]} />
              <Text style={{ marginHorizontal: 10, color: '#8E8E93' }}>OR</Text>
              <View style={[styles.line, { backgroundColor: isDark ? '#333' : '#E5E5EA' }]} />
            </View>

            <TouchableOpacity 
              style={[styles.googleBtn, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: isDark ? '#333' : '#E5E5EA' }]}
              onPress={handleGooglePress}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color={isDark ? '#FFF' : '#000'} style={{ marginRight: 10 }} />
              <Text style={[styles.googleText, { color: text }]}>Continue with Google</Text>
            </TouchableOpacity>

          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: '#8E8E93' }]}>
              {isLogin ? "No account?" : "Have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={[styles.linkText, { color: text }]}>
                {isLogin ? ' Sign up' : ' Log in'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 30, width: '100%', maxWidth: 500, alignSelf: 'center' },
  
  header: { marginBottom: 30 },
  
  iconShadow: {
    width: 90, 
    height: 90, 
    borderRadius: 22, 
    marginBottom: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  appIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 22, 
  },

  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10 },
  subtitle: { fontSize: 17, color: '#8E8E93', lineHeight: 24 },
  
  form: { gap: 16 },
  input: { height: 56, borderRadius: 14, paddingHorizontal: 18, fontSize: 17, fontWeight: '500' },
  requirementText: { fontSize: 13, color: '#8E8E93', marginLeft: 5, marginTop: -8 },
  button: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  line: { flex: 1, height: 1 },
  
  googleBtn: { 
    height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', 
    borderWidth: 1, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4 
  },
  googleText: { fontSize: 17, fontWeight: '600' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, alignItems: 'center' },
  footerText: { fontSize: 15 },
  linkText: { fontSize: 15, fontWeight: '700', marginLeft: 5 },
});

export default AuthScreen;