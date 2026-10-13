package com.grocylite

import android.media.AudioManager
import android.media.ToneGenerator
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BeepSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var toneGenerator: ToneGenerator? = null

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_ALARM, 100)
        } catch (e: Exception) {
            try {
                toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 100)
            } catch (e2: Exception) {
                toneGenerator = null
            }
        }
    }

    override fun getName(): String {
        return "BeepSound"
    }

    @ReactMethod
    fun playSuccess() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun playError() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_NACK, 500)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
