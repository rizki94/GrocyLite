import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
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

  const initiateDownload = async (url: string) => {
    const { dirs } = ReactNativeBlobUtil.fs;
    const fileName = 'GrocyLite-latest.apk';
    const apkFilePath = `${dirs.DownloadDir}/${fileName}`;

    try {
      // Alert user the download is starting
      Alert.alert(
        'Downloading...',
        'The update is downloading in the background. Please check your notification bar for progress.',
        [{ text: 'OK' }]
      );

      // Use Android Download Manager for visible progress and auto-registration
      const res = await ReactNativeBlobUtil.config({
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path: apkFilePath,
          description: 'Downloading GrocyLite update...',
          mime: 'application/vnd.android.package-archive',
          mediaScannable: true,
        },
      }).fetch('GET', url);

      // Trigger Android's package installer with FileProvider authority
      ReactNativeBlobUtil.android.actionViewIntent(
        res.path(),
        'application/vnd.android.package-archive',
        'com.grocylite.provider'
      );
    } catch (error) {
      Alert.alert(
        'Download Error',
        'Could not download the update. Please try again later or check your internet connection.'
      );
      console.error('Update download failed:', error);
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
          onPress: () => initiateDownload(downloadUrl),
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
