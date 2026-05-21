import { app } from 'electron';

import { registerAudiobookshelfIpcHandlers } from './audiobookshelf-ipc';
import { shutdownAudiobookshelfProxy } from './audiobookshelf-proxy';

registerAudiobookshelfIpcHandlers();

app.on('before-quit', shutdownAudiobookshelfProxy);
