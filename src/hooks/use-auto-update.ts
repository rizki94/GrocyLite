import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform, NativeModules } from 'react-native';
const { SilentInstaller } = NativeModules;

import DeviceInfo from 'react-native-device-info';
import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from 'axios';

// GitHub Repository Configuration
const GITHUB_OWNER = 'rizki94';
const GITHUB_REPO = 'GrocyLite';
const LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

interface GitHubAsset {
  name: string;
  size?: number; // Size in bytes from GitHub API
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  body: string;
  assets: GitHubAsset[];
}

/**
 * Normalizes ABI names for flexible matching with GitHub release asset filenames
 * e.g., 'arm64-v8a' -> ['arm64-v8a', 'arm64']
 */
const getAbiAliases = (abi: string): string[] => {
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
const pickBestAsset = async (assets: GitHubAsset[]): Promise<{ asset: GitHubAsset; abiLabel: string } | null> => {
  const apkAssets = assets.filter((a) => a.name.toLowerCase().endsWith('.apk'));
  if (apkAssets.length === 0) return null;

  // 1. Query device hardware supported ABIs in order of preference (e.g. ['arm64-v8a', 'armeabi-v7a'])
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

  // 3. Fallback: Check for universal APK
  const universalMatch = apkAssets.find((a) => a.name.toLowerCase().includes('universal'));
  if (universalMatch) {
    return { asset: universalMatch, abiLabel: 'universal' };
  }

  // 4. Fallback: Any APK in release
  return { asset: apkAssets[0], abiLabel: 'default' };
};

export const useAutoUpdate = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { dirs } = ReactNativeBlobUtil.fs;

  /**
   * Cleans up older GrocyLite APKs and incomplete .tmp downloads from DownloadDir
   */
  const cleanStaleApks = async (keepFilePath?: string) => {
    try {
      const files = await ReactNativeBlobUtil.fs.ls(dirs.DownloadDir);
      for (const fileName of files) {
        if (fileName.startsWith('GrocyLite-') && (fileName.endsWith('.apk') || fileName.endsWith('.tmp'))) {
          const fullPath = `${dirs.DownloadDir}/${fileName}`;
          if (fullPath !== keepFilePath) {
            console.log('Cleaning stale APK file:', fullPath);
            await ReactNativeBlobUtil.fs.unlink(fullPath).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('Stale APK cleanup warning:', e);
    }
  };

  const initiateDownload = async (asset: GitHubAsset, version: string, abiLabel: string) => {
    const finalApkPath = `${dirs.DownloadDir}/GrocyLite-${version}-${abiLabel}.apk`;
    const tempApkPath = `${finalApkPath}.tmp`;

    try {
      // ── Step 1: Verify if final APK is already downloaded & completely intact ──
      const alreadyExists = await ReactNativeBlobUtil.fs.exists(finalApkPath);
      let readyToInstall = false;

      if (alreadyExists) {
        const stat = await ReactNativeBlobUtil.fs.stat(finalApkPath);
        const fileSize = Number(stat.size);

        // Verify file size matches GitHub asset size or is sufficiently large (> 5MB)
        if (asset.size && asset.size > 0) {
          if (fileSize === asset.size) {
            console.log('Existing APK matches expected byte size. Skipping download.');
            readyToInstall = true;
          } else {
            console.warn(`Existing APK size mismatch (${fileSize} vs ${asset.size}). Corrupt file, deleting.`);
            await ReactNativeBlobUtil.fs.unlink(finalApkPath).catch(() => {});
          }
        } else if (fileSize > 5 * 1024 * 1024) {
          // If GitHub asset size is unavailable, check if > 5MB
          readyToInstall = true;
        } else {
          await ReactNativeBlobUtil.fs.unlink(finalApkPath).catch(() => {});
        }
      }

      // ── Step 2: Download cleanly into .tmp if not ready ───────────────────────
      if (!readyToInstall) {
        // Delete leftover partial temp file from any previous interrupted download
        if (await ReactNativeBlobUtil.fs.exists(tempApkPath)) {
          await ReactNativeBlobUtil.fs.unlink(tempApkPath).catch(() => {});
        }

        console.log(`Starting clean download from: ${asset.browser_download_url}`);

        // Download via ReactNativeBlobUtil with Android DownloadManager
        const res = await ReactNativeBlobUtil.config({
          path: tempApkPath,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: `GrocyLite v${version} (${abiLabel})`,
            description: `Mengunduh pembaharuan aplikasi...`,
            mime: 'application/vnd.android.package-archive',
            mediaScannable: true,
            path: tempApkPath,
          },
        }).fetch('GET', asset.browser_download_url);

        const downloadedPath = res.path();

        // ── Step 3: Validate downloaded .tmp file integrity ───────────────────
        const tempExists = await ReactNativeBlobUtil.fs.exists(downloadedPath);
        if (!tempExists) {
          throw new Error('Unduhan gagal: File sementara tidak ditemukan.');
        }

        const tempStat = await ReactNativeBlobUtil.fs.stat(downloadedPath);
        const tempSize = Number(tempStat.size);

        if (asset.size && asset.size > 0 && tempSize !== asset.size) {
          await ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => {});
          throw new Error(`Ukuran file tidak lengkap (${tempSize} / ${asset.size} bytes). Unduhan dibatalkan.`);
        }

        if (tempSize < 5 * 1024 * 1024) {
          await ReactNativeBlobUtil.fs.unlink(downloadedPath).catch(() => {});
          throw new Error('File APK terlalu kecil dan kemungkinan rusak.');
        }

        // ── Step 4: Atomic move from .tmp to final .apk ────────────────────────
        if (await ReactNativeBlobUtil.fs.exists(finalApkPath)) {
          await ReactNativeBlobUtil.fs.unlink(finalApkPath).catch(() => {});
        }
        await ReactNativeBlobUtil.fs.mv(downloadedPath, finalApkPath);
        console.log('Update APK successfully verified and moved to:', finalApkPath);
      }

      // ── Step 5: Clean up older APKs to save device disk space ────────────────
      cleanStaleApks(finalApkPath).catch(() => {});

      // ── Step 6: Trigger Installation ─────────────────────────────────────────
      // Try silent install first (Android 12+ package installer session)
      if (SilentInstaller) {
        try {
          console.log('Attempting silent install via PackageInstaller...');
          await SilentInstaller.installPackage(finalApkPath);
          console.log('Silent install session committed.');
          return;
        } catch (silentError) {
          console.warn('Silent install failed, falling back to manual:', silentError);
        }
      }

      // Trigger Android's manual installation intent
      console.log('Falling back to manual installation intent');
      if (SilentInstaller) {
        await SilentInstaller.manualInstall(finalApkPath);
      } else {
        ReactNativeBlobUtil.android.actionViewIntent(
          finalApkPath,
          'application/vnd.android.package-archive',
          'com.grocylite.provider'
        );
      }
    } catch (error: any) {
      // ── Error / Cancel recovery: Clean up corrupt or temp files ─────────────
      console.error('Update failed:', error);
      await ReactNativeBlobUtil.fs.unlink(tempApkPath).catch(() => {});

      // If installation threw parse or corrupt error, delete final APK too
      if (error?.message?.toLowerCase().includes('corrupt') || error?.message?.toLowerCase().includes('parse')) {
        await ReactNativeBlobUtil.fs.unlink(finalApkPath).catch(() => {});
      }

      Alert.alert(
        'Update Error',
        `Gagal memproses pembaruan: ${error?.message || 'Terjadi kesalahan saat mengunduh.'}\nSilakan coba lagi.`
      );
    }
  };

  const promptUpdate = (
    version: string,
    asset: GitHubAsset,
    abiLabel: string,
    releaseNotes: string
  ) => {
    const sizeInMB = asset.size ? ` (~${(asset.size / (1024 * 1024)).toFixed(1)} MB)` : '';
    Alert.alert(
      'Update Available',
      `Versi baru (${version}) GrocyLite tersedia untuk perangkat Anda (${abiLabel})${sizeInMB}.\n\n${
        releaseNotes || 'Perbaikan bug dan peningkatan performa.'
      }`,
      [
        {
          text: 'Nanti',
          style: 'cancel',
        },
        {
          text: 'Perbarui Sekarang',
          onPress: () => initiateDownload(asset, version, abiLabel),
        },
      ],
      { cancelable: true }
    );
  };

  const checkForUpdates = useCallback(async (manual = false) => {
    if (Platform.OS !== 'android') return;

    setIsChecking(true);
    try {
      const response = await axios.get<GitHubRelease>(LATEST_RELEASE_API);
      const latestRelease = response.data;

      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const currentVersion = DeviceInfo.getVersion();

      if (latestVersion > currentVersion) {
        // Find best matching asset for this device's CPU architecture
        const matched = await pickBestAsset(latestRelease.assets || []);

        if (matched) {
          promptUpdate(latestVersion, matched.asset, matched.abiLabel, latestRelease.body);
        } else if (manual) {
          Alert.alert('No APK Found', 'Versi baru ditemukan tetapi paket instalasi (.apk) tidak tersedia.');
        }
      } else if (manual) {
        Alert.alert('Status', 'Aplikasi Anda sudah menggunakan versi terbaru.');
      }
    } catch (error) {
      if (manual) {
        Alert.alert('Update Error', 'Tidak dapat memeriksa pembaruan. Pastikan perangkat terhubung ke internet.');
      }
      console.warn('Auto-update check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkForUpdates(false);
  }, [checkForUpdates]);

  return { checkForUpdates, isChecking };
};
