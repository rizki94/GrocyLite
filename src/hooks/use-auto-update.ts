import { useEffect } from 'react';
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
  useEffect(() => {
    // Auto-update only makes sense for Android APK sideloading
    if (Platform.OS !== 'android') return;

    const checkForUpdates = async () => {
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
          }
        }
      } catch (error) {
        // Silent fail on update check errors (e.g., offline or API limit)
        console.warn('Auto-update check failed:', error);
      }
    };

    checkForUpdates();
  }, []);

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

  const initiateDownload = async (url: string) => {
    const { dirs } = ReactNativeBlobUtil.fs;
    const apkFilePath = `${dirs.CacheDir}/GrocyLite-latest.apk`;

    try {
      const res = await ReactNativeBlobUtil.config({
        path: apkFilePath,
        fileCache: true,
      }).fetch('GET', url);

      // Trigger Android's package installer
      ReactNativeBlobUtil.android.actionViewIntent(
        res.path(),
        'application/vnd.android.package-archive'
      );
    } catch (error) {
      Alert.alert('Download Error', 'Could not download the update. Please try again later.');
      console.error('Update download failed:', error);
    }
  };
};
