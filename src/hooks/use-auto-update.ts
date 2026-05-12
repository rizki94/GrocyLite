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
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  body: string;
  assets: GitHubAsset[];
}

export const useAutoUpdate = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { dirs } = ReactNativeBlobUtil.fs;
  const getApkPath = (version: string) => `${dirs.DownloadDir}/GrocyLite-${version}.apk`;


  const initiateDownload = async (url: string, version: string) => {
    try {
      const apkFilePath = getApkPath(version);
      
      // Check if file already exists
      const alreadyDownloaded = await ReactNativeBlobUtil.fs.exists(apkFilePath);
      let path = apkFilePath;

      if (alreadyDownloaded) {
        console.log('APK already exists, skipping download:', apkFilePath);
      } else {
        console.log('Starting download from:', url);
        // Use ReactNativeBlobUtil with Android Download Manager for progress visibility
        const res = await ReactNativeBlobUtil.config({
          path: apkFilePath,
          addAndroidDownloads: {
            useDownloadManager: true,
            notification: true,
            title: 'GrocyLite Update',
            description: `Downloading version ${version}...`,
            mime: 'application/vnd.android.package-archive',
            mediaScannable: true,
            path: apkFilePath,
          }
        }).fetch('GET', url);
        path = res.path();
        console.log('Update downloaded to:', path);
      }

      // Verify file exists before installing
      const exists = await ReactNativeBlobUtil.fs.exists(path);
      if (!exists) {
        throw new Error('APK file not found at path: ' + path);
      }

      // Try silent install first (works on Android 12+ non-rooted)
      if (SilentInstaller) {
        try {
          console.log('Attempting silent install via PackageInstaller...');
          await SilentInstaller.installPackage(path);
          console.log('Silent install session committed.');
          return;
        } catch (silentError) {
          console.warn('Silent install failed, falling back to manual:', silentError);
        }
      }

      // Trigger Android's package installer (manual fallback)
      console.log('Falling back to manual installation intent');
      if (SilentInstaller) {
        await SilentInstaller.manualInstall(path);
      } else {
        // Ultimate fallback if native module is missing (should not happen after rebuild)
        ReactNativeBlobUtil.android.actionViewIntent(
          path,
          'application/vnd.android.package-archive',
          'com.grocylite.provider'
        );
      }
    } catch (error) {
      Alert.alert(
        'Update Error',
        'Could not complete the update process. Please try again later.'
      );
      console.error('Update failed:', error);
    }
  };

  const promptUpdate = (version: string, downloadUrl: string, releaseNotes: string) => {
    Alert.alert(
      'Update Available',
      `A new version (${version}) of GrocyLite is available.\n\n${releaseNotes || 'Bug fixes and performance improvements.'}`,
      [
        {
          text: 'Later',
          style: 'cancel',
        },
        {
          text: 'Update now',
          onPress: () => initiateDownload(downloadUrl, version),
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

      // Strip 'v' prefix if exists (e.g., 'v1.0.1' -> '1.0.1')
      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const currentVersion = DeviceInfo.getVersion();

      // Simple string comparison for versioning (e.g., '1.0.1' > '1.0.0')
      if (latestVersion > currentVersion) {
        // Find the first .apk asset in the release
        const apkAsset = latestRelease.assets.find(asset => 
          asset.name.toLowerCase().endsWith('.apk')
        );

        if (apkAsset) {
          promptUpdate(latestVersion, apkAsset.browser_download_url, latestRelease.body);
        } else if (manual) {
          Alert.alert('No APK Found', 'A new version exists but no installation package was found.');
        }
      } else if (manual) {
        Alert.alert('Status', "You're already using the latest version.");
      }
    } catch (error) {
      if (manual) {
        Alert.alert('Update Error', 'Could not check for updates. Please check your internet connection.');
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
