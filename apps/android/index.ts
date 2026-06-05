import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

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

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
