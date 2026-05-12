package com.grocylite

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

class SilentInstallerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SilentInstaller"
    }

    @ReactMethod
    fun installPackage(apkPath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val apkFile = File(apkPath)
            if (!apkFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK file not found at $apkPath")
                return
            }

            val packageInstaller = context.packageManager.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            }

            val sessionId = packageInstaller.createSession(params)
            val session = packageInstaller.openSession(sessionId)

            val inputStream: InputStream = FileInputStream(apkFile)
            val out = session.openWrite("GrocyLiteUpdate", 0, apkFile.length())
            
            val buffer = ByteArray(65536)
            var n: Int
            while (inputStream.read(buffer).also { n = it } != -1) {
                out.write(buffer, 0, n)
            }
            session.fsync(out)
            out.close()
            inputStream.close()

            val intent = Intent(context, SilentInstallerReceiver::class.java).apply {
                action = "com.grocylite.INSTALL_COMPLETE"
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                sessionId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            session.commit(pendingIntent.intentSender)
            session.close()
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INSTALL_ERROR", e.message)
        }
    }

    @ReactMethod
    fun manualInstall(apkPath: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val apkFile = File(apkPath)
            if (!apkFile.exists()) {
                promise.reject("FILE_NOT_FOUND", "APK file not found at $apkPath")
                return
            }

            val uri: Uri = FileProvider.getUriForFile(
                context,
                "com.grocylite.provider",
                apkFile
            )
            
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            
            context.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MANUAL_INSTALL_ERROR", e.message)
        }
    }
}

class SilentInstallerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        // App normally restarts on successful self-update
    }
}
