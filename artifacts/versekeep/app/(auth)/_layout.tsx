import { Stack } from 'expo-router';
import { T } from '../../constants/theme';

/**
 * Auth layout — wraps login and signup screens.
 * No bottom tab bar. Clean stack with no header.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:       false,
        contentStyle:      { backgroundColor: T.black },
        animation:         'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}
