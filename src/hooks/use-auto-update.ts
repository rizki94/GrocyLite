import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Platform, NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from 'axios';

const { SilentInstaller } = NativeModules;

// GitHub Repository Configuration
const GITHUB_OWNER = 'rizki94';
const GITHUB_REPO = 'GrocyLite';
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface GitHubAsset {
  name: string;
  size?: number; // Size in bytes from GitHub API
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  body: string;
  assets: GitHubAsset[];
}

export type UpdatePhase = 'idle' | 'ready' | 'downloading' | 'installing' | 'error';

interface UpdateState {
  showModal: boolean;
  phase: UpdatePhase;
  isChecking: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  matchedAsset: GitHubAsset | null;
  abiLabel: string;
  downloadProgress: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  errorMessage: string | null;
}

const initialState: UpdateState = {
  showModal: false,
  phase: 'idle',
  isChecking: false,
  latestVersion: '',
  currentVersion: DeviceInfo.getVersion(),
  releaseNotes: '',
  matchedAsset: null,
  abiLabel: '',
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: 0,
  errorMessage: null,
};

// Module-level reactive store
let currentState: UpdateState = { ...initialState };
const listeners = new Set<(state: UpdateState) => void>();

function emitUpdate(partial: Partial<UpdateState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((listener) => listener(currentState));
}

// Global active download task reference for cancellation
let activeDownloadTask: any = null;

/**
 * Normalizes ABI names for flexible matching with GitHub release asset filenames
 * e.g., 'arm64-v8a' -> ['arm64-v8a', 'arm64']
 */
export const getAbiAliases = (abi: string): string[] => {
  const lower = abi.toLowerCase();
  if (lower.includes('arm64')) return ['arm64-v8a', 'arm64'];
  if (lower.includes('armeabi') || lower.includes('armv7')) return ['armeabi-v7a', 'armeabi', 'armv7'];
  if (lower.includes('x86_64')) return ['x86_64'];
  if (lower.includes('x86')) return ['x86'];
  return [lower];
};

/**
 * Pick the best matching APK asset for the current device's hardware architecture
 */
export const pickBestAsset = async (
  assets: GitHubAsset[]
): Promise<{ asset: GitHubAsset; abiLabel: string } | null> => {
  const apkAssets = assets.filter((a) => a.name.toLowerCase().endsWith('.apk'));
  if (apkAssets.length === 0) return null;

  // 1. Query device hardware supported ABIs in order of preference
  let deviceAbis: string[] = [];
  try {
    deviceAbis = await DeviceInfo.supportedAbis();
  } catch (err) {
    console.warn('Failed to detect device ABIs:', err);
  }

  // 2. Try matching the device's preferred ABIs
  for (const abi of deviceAbis) {
    const aliases = getAbiAliases(abi);
    for (const alias of aliases) {
      const match = apkAssets.find((a) => a.name.toLowerCase().includes(alias));
      if (match) {
        return { asset: match, abiLabel: abi };
      }
    }
  }

  // 3. Fallback: Universal APK
  const universalMatch = apkAssets.find((a) => a.name.toLowerCase().includes('universal'));
  if (universalMatch) {
    return { asset: universalMatch, abiLabel: 'universal' };
  }

  // 4. Fallback: First APK
  return { asset: apkAssets[0], abiLabel: 'default' };
};

/**
 * Hook to consume update store state in React components
 */
export const useUpdateStore = () => {
  const [state, setState] = useState<UpdateState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
};

/**
 * Close update modal
 */
export const closeUpdateModal = () => {
  if (currentState.phase === 'downloading' || currentState.phase === 'installing') {
    return;
  }
  emitUpdate({ showModal: false });
};

/**
 * Cancel active download
 */
export const cancelUpdateDownload = async () => {
  if (activeDownloadTask) {
    try {
      activeDownloadTask.cancel(() => {});
    } catch {}
    activeDownloadTask = null;
  }

  // Clean up incomplete temp files
  try {
    const tempPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/GrocyLite-update.apk.tmp`;
    if (await ReactNativeBlobUtil.fs.exists(tempPath)) {
      await ReactNativeBlobUtil.fs.unlink(tempPath).catch(() => {});
    }
  } catch {}

  emitUpdate({
    phase: 'ready',
    downloadProgress: 0,
    downloadedBytes: 0,
  });
};

/**
 * Start direct download & install flow
 */
export const startUpdateDownload = async () => {
  const asset = currentState.matchedAsset;
  if (!asset) {
    emitUpdate({ phase: 'error', errorMessage: 'Berkas pembaruan tidak ditemukan.' });
    return;
  }

  const { dirs } = ReactNativeBlobUtil.fs;
  const finalApkPath = `${dirs.CacheDir}/GrocyLite-update.apk`;
  const tempApkPath = `${finalApkPath}.tmp`;

  emitUpdate({
    phase: 'downloading',
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: asset.size || 0,
    errorMessage: null,
  });

  try {
    // 1. Remove previous temp file if exists
    if (await ReactNativeBlobUtil.fs.exists(tempApkPath)) {
      await ReactNativeBlobUtil.fs.unlink(tempApkPath).catch(() => {});
    }

    // 2. Start direct streaming download into CacheDir (Internal App Cache)
    // Direct stream automatically handles HTTP 302 redirects cleanly
    activeDownloadTask = ReactNativeBlobUtil.config({
      path: tempApkPath,
      fileCache: true,
      followRedirect: true,
      overwrite: true,
    }).fetch('GET', asset.browser_download_url);

    // Track real-time byte progress
    activeDownloadTask.progress({ interval: 150 }, (received: number, total: number) => {
      const safeTotal = total > 0 ? total : asset.size || 1;
      const pct = Math.min(Math.max(Math.round((received / safeTotal) * 100), 0), 100);
      emitUpdate({
        downloadProgress: pct,
        downloadedBytes: received,
        totalBytes: safeTotal,
      });
    });

    const res = await activeDownloadTask;
    activeDownloadTask = null;

    const downloadedPath = res.path();

    // 3. Verify file integrity
    const exists = await ReactNativeBlobUtil.fs.exists(downloadedPath);
    if (!exists) {
      throw new Error('File unduhan tidak ditemukan.');
    }

    const stat = await ReactNativeBlobUtil.fs.stat(downloadedPath);
    const downloadedSize = Number(stat.size);

    if (asset.size && asset.size > 0 && Math.abs(downloadedSize - asset.size) > 1024) {
      await ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => {});
      throw new Error(`Ukuran file tidak lengkap (${(downloadedSize / (1024 * 1024)).toFixed(1)} MB). Unduhan dibatalkan.`);
    }

    if (downloadedSize < 5 * 1024 * 1024) {
      await ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => {});
      throw new Error('Berkas APK terlalu kecil dan kemungkinan rusak.');
    }

    // 4. Move temp file to final APK
    if (await ReactNativeBlobUtil.fs.exists(finalApkPath)) {
      await ReactNativeBlobUtil.fs.unlink(finalApkPath).catch(() => {});
    }
    await ReactNativeBlobUtil.fs.mv(downloadedPath, finalApkPath);

    // 5. Trigger Installation
    emitUpdate({
      phase: 'installing',
      downloadProgress: 100,
    });

    if (SilentInstaller) {
      try {
        console.log('Attempting package installation session...');
        await SilentInstaller.installPackage(finalApkPath);
        return;
      } catch (silentErr: any) {
        console.warn('Session install failed, attempting manual install:', silentErr);
        if (silentErr?.code === 'PERMISSION_REQUIRED' || silentErr?.message?.includes('izin')) {
          emitUpdate({
            phase: 'error',
            errorMessage: 'Izin instalasi aplikasi tidak dikenal diperlukan. Silakan izinkan lalu coba kembali.',
          });
          return;
        }
      }

      // Fallback manual install via FileProvider
      try {
        await SilentInstaller.manualInstall(finalApkPath);
      } catch (manualErr: any) {
        throw new Error(manualErr?.message || 'Gagal membuka penginstal paket Android.');
      }
    } else {
      // Fallback if native module unavailable
      ReactNativeBlobUtil.android.actionViewIntent(
        finalApkPath,
        'application/vnd.android.package-archive',
        'com.grocylite.provider'
      );
    }
  } catch (err: any) {
    console.error('Update download error:', err);
    // Ignore error if canceled intentionally
    if (err?.message?.includes('cancelled') || err?.message?.includes('canceled')) {
      return;
    }
    emitUpdate({
      phase: 'error',
      errorMessage: err?.message || 'Terjadi kesalahan saat mengunduh pembaruan.',
    });
  }
};

/**
 * Main Auto Update Hook
 */
export const useAutoUpdate = () => {
  const storeState = useUpdateStore();

  const checkForUpdates = useCallback(async (manual = false) => {
    if (Platform.OS !== 'android') return;

    emitUpdate({ isChecking: true });
    try {
      const response = await axios.get<GitHubRelease>(LATEST_RELEASE_API, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        timeout: 10000,
      });

      const latestRelease = response.data;
      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const currentVersion = DeviceInfo.getVersion();

      if (latestVersion > currentVersion) {
        const matched = await pickBestAsset(latestRelease.assets || []);

        if (matched) {
          emitUpdate({
            showModal: true,
            phase: 'ready',
            latestVersion,
            currentVersion,
            releaseNotes: latestRelease.body || '',
            matchedAsset: matched.asset,
            abiLabel: matched.abiLabel,
            downloadProgress: 0,
            downloadedBytes: 0,
            totalBytes: matched.asset.size || 0,
            errorMessage: null,
          });
        } else if (manual) {
          Alert.alert('APK Tidak Ditemukan', 'Versi baru ditemukan tetapi paket instalasi (.apk) belum tersedia di rilis GitHub.');
        }
      } else if (manual) {
        Alert.alert('Status', 'Aplikasi GrocyLite Anda sudah menggunakan versi terbaru (v' + currentVersion + ').');
      }
    } catch (error: any) {
      console.warn('Update check failed:', error);
      if (manual) {
        Alert.alert('Gagal Memeriksa Pembaruan', 'Pastikan perangkat Anda terhubung ke internet dan coba kembali.');
      }
    } finally {
      emitUpdate({ isChecking: false });
    }
  }, []);

  useEffect(() => {
    // Check for updates on startup
    checkForUpdates(false);
  }, [checkForUpdates]);

  return {
    checkForUpdates,
    isChecking: storeState.isChecking,
    showModal: storeState.showModal,
    phase: storeState.phase,
    downloadProgress: storeState.downloadProgress,
  };
};
