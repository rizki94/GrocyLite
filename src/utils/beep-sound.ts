import { NativeModules } from 'react-native';

const { BeepSound } = NativeModules;

export const playBeepSuccess = () => {
  try {
    if (BeepSound && typeof BeepSound.playSuccess === 'function') {
      BeepSound.playSuccess();
    }
  } catch (e) {
    console.warn('Error playing success beep:', e);
  }
};

export const playBeepError = () => {
  try {
    if (BeepSound && typeof BeepSound.playError === 'function') {
      BeepSound.playError();
    }
  } catch (e) {
    console.warn('Error playing error beep:', e);
  }
};
