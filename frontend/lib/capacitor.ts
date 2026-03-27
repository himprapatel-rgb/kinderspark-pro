/**
 * Capacitor native bridge utilities
 * 
 * These helpers detect if the app is running inside Capacitor (native iOS)
 * and provide access to native features like haptics, status bar, and splash screen.
 * 
 * When running as a regular web app, all functions gracefully degrade to no-ops.
 */

/** Check if running inside a native Capacitor shell */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

/** Check if running on iOS specifically */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (window as any).Capacitor?.getPlatform?.() === 'ios'
}

/** Trigger a light haptic tap (native only) */
export async function hapticTap(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {}
}

/** Trigger a medium haptic impact (native only) */
export async function hapticImpact(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {}
}

/** Trigger a success notification haptic (native only) */
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {}
}

/** Hide the native splash screen */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {}
}

/** Set status bar style (light text on dark bg) */
export async function configureStatusBar(): Promise<void> {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    if (isIOS()) {
      await StatusBar.setOverlaysWebView({ overlay: true })
    }
  } catch {}
}

/** Register for push notifications (iOS will ask for permission) */
export async function registerPushNotifications(): Promise<string | null> {
  if (!isNative()) return null
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') return null
    
    await PushNotifications.register()
    
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('[Push] Registered with token:', token.value)
        resolve(token.value)
      })
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err)
        resolve(null)
      })
    })
  } catch {
    return null
  }
}

/** Initialize all native features on app start */
export async function initNative(): Promise<void> {
  if (!isNative()) return
  
  console.log('[Native] Initializing Capacitor plugins...')
  await configureStatusBar()
  await hideSplash()
  
  // Register push after a slight delay to not block initial render
  setTimeout(() => registerPushNotifications(), 2000)
  
  console.log('[Native] Ready ✨')
}
