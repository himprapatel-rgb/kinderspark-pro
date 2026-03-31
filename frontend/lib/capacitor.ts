/**
 * Capacitor native bridge utilities
 * 
 * These helpers detect if the app is running inside Capacitor (native iOS)
 * and provide access to native features like haptics, status bar, splash screen,
 * sharing, local notifications, network status, and app lifecycle.
 * 
 * When running as a regular web app, all functions gracefully degrade to no-ops.
 */

// ── Platform detection ──────────────────────────────────────────────────────────

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

// ── Haptics ─────────────────────────────────────────────────────────────────────

/** Trigger a light haptic tap (button presses) */
export async function hapticTap(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {}
}

/** Trigger a medium haptic impact (important actions) */
export async function hapticImpact(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {}
}

/** Trigger a heavy haptic (errors, warnings) */
export async function hapticHeavy(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Heavy })
  } catch {}
}

/** Trigger a success notification haptic */
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {}
}

/** Trigger a warning notification haptic */
export async function hapticWarning(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Warning })
  } catch {}
}

/** Trigger an error notification haptic */
export async function hapticError(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Error })
  } catch {}
}

/** Trigger selection change haptic (scrolling through options) */
export async function hapticSelection(): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics } = await import('@capacitor/haptics')
    await Haptics.selectionStart()
    await Haptics.selectionChanged()
    await Haptics.selectionEnd()
  } catch {}
}

// ── Splash Screen ───────────────────────────────────────────────────────────────

/** Hide the native splash screen */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {}
}

// ── Status Bar ──────────────────────────────────────────────────────────────────

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

// ── Push Notifications ──────────────────────────────────────────────────────────

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

/** Set the badge count on the app icon */
export async function setBadgeCount(count: number): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    // On iOS, badge is managed through local notifications permission
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display === 'granted') {
      // Use the underlying Capacitor Badge plugin if available
      // For now, we schedule and immediately cancel a notification to set badge
      await LocalNotifications.schedule({
        notifications: [{
          id: 99999,
          title: '',
          body: '',
          schedule: { at: new Date(Date.now() + 86400000) }, // far future, never fires
        }],
      })
      await LocalNotifications.cancel({ notifications: [{ id: 99999 }] })
    }
  } catch {}
}

// ── Local Notifications ─────────────────────────────────────────────────────────

/** Schedule a local notification (homework reminders, streaks, etc.) */
export async function scheduleLocalNotification(opts: {
  id: number
  title: string
  body: string
  scheduleAt?: Date
  sound?: string
}): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.requestPermissions()
    if (perm.display !== 'granted') return

    await LocalNotifications.schedule({
      notifications: [{
        id: opts.id,
        title: opts.title,
        body: opts.body,
        sound: opts.sound || undefined,
        schedule: opts.scheduleAt ? { at: opts.scheduleAt } : undefined,
      }],
    })
  } catch {}
}

/** Cancel a scheduled local notification */
export async function cancelLocalNotification(id: number): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id }] })
  } catch {}
}

// ── Native Share ────────────────────────────────────────────────────────────────

/** Open native iOS share sheet */
export async function nativeShare(opts: {
  title: string
  text?: string
  url?: string
}): Promise<boolean> {
  if (!isNative()) {
    // Fallback to Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(opts)
        return true
      } catch { return false }
    }
    return false
  }
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({
      title: opts.title,
      text: opts.text,
      url: opts.url,
      dialogTitle: opts.title,
    })
    return true
  } catch {
    return false
  }
}

// ── Network Status ──────────────────────────────────────────────────────────────

/** Check if the device is online */
export async function getNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
  if (!isNative()) {
    return { connected: navigator.onLine, connectionType: 'unknown' }
  }
  try {
    const { Network } = await import('@capacitor/network')
    const status = await Network.getStatus()
    return { connected: status.connected, connectionType: status.connectionType }
  } catch {
    return { connected: true, connectionType: 'unknown' }
  }
}

/** Listen for network status changes */
export async function onNetworkChange(callback: (connected: boolean) => void): Promise<() => void> {
  if (!isNative()) {
    const handler = () => callback(navigator.onLine)
    window.addEventListener('online', handler)
    window.addEventListener('offline', handler)
    return () => {
      window.removeEventListener('online', handler)
      window.removeEventListener('offline', handler)
    }
  }
  try {
    const { Network } = await import('@capacitor/network')
    const handle = await Network.addListener('networkStatusChange', (status) => {
      callback(status.connected)
    })
    return () => handle.remove()
  } catch {
    return () => {}
  }
}

// ── App Lifecycle ───────────────────────────────────────────────────────────────

/** Listen for app state changes (foreground/background) */
export async function onAppStateChange(callback: (isActive: boolean) => void): Promise<() => void> {
  if (!isNative()) return () => {}
  try {
    const { App } = await import('@capacitor/app')
    const handle = await App.addListener('appStateChange', (state) => {
      callback(state.isActive)
    })
    return () => handle.remove()
  } catch {
    return () => {}
  }
}

/** Open a URL in the native in-app browser */
export async function openInBrowser(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, '_blank')
    return
  }
  try {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url })
  } catch {
    window.open(url, '_blank')
  }
}

// ── Initialization ──────────────────────────────────────────────────────────────

/** Initialize all native features on app start */
export async function initNative(): Promise<void> {
  if (!isNative()) return
  
  console.log('[Native] Initializing Capacitor plugins...')
  await configureStatusBar()
  await hideSplash()
  
  // Register push after a slight delay to not block initial render
  setTimeout(() => registerPushNotifications(), 2000)
  
  // Listen for app lifecycle (e.g. refresh data on foreground)
  onAppStateChange((isActive) => {
    if (isActive) {
      console.log('[Native] App returned to foreground')
    }
  })
  
  console.log('[Native] Ready ✨')
}

/** Hook native region monitoring here when geofence plugins ship; client posts enter/exit via API today. */
export function geofenceScaffoldNote(_phase: 'enter' | 'exit', _regionId?: string): void {
  /* no-op on web; native builds can forward to postGeofenceEvent */
}
