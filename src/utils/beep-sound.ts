import { NativeModules, Vibration } from 'react-native';

const { BeepSound } = NativeModules;

export const playBeepSuccess = () => {
  try {
    Vibration.vibrate(80);
    if (BeepSound?.playSuccess) {
      BeepSound.playSuccess();
    }
  } catch (e) {
    console.warn('Error playing success beep:', e);
  }
};

export const playBeepError = () => {
  try {
    Vibration.vibrate([0, 250, 100, 250]);
    if (BeepSound?.playError) {
      BeepSound.playError();
    }
  } catch (e) {
    console.warn('Error playing error beep:', e);
  }
};
