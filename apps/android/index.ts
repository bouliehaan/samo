import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';

import App from './App';
import { schedulePeriodicCatalogSync } from './src/services/headless-catalog-sync';

// Install (or re-join) the Phase 5 PROPER periodic catalog-sync schedule.
// The Kotlin worker (SamoCatalogSyncWorker → SamoCatalogSync) runs the
// actual sync against the catalog DB — no React headless context, no JS
// dependency at fire time. JS only schedules + pushes auth changes through
// the mirror. KEEP policy on the native side means subsequent app launches
// don't reset the interval timer, so the next periodic firing isn't
// deferred by each cold start.
void schedulePeriodicCatalogSync();

// Use AppRegistry directly instead of Expo's registerRootComponent to
// guarantee that `withDevTools` (and its implicit global `useKeepAwake`)
// is completely bypassed in production builds.
AppRegistry.registerComponent('main', () => App);
