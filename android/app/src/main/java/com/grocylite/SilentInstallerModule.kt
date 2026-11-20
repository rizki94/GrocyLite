package com.grocylite

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
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

            // On Android 8.0+, verify unknown app installation permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
                val manageIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(manageIntent)
                promise.reject("PERMISSION_REQUIRED", "Harap berikan izin instalasi aplikasi tidak dikenal untuk GrocyLite.")
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
            
            // FLAG_MUTABLE is strictly required on Android 12+ so PackageInstaller can fill in EXTRA_STATUS & EXTRA_INTENT
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val pendingIntent = PendingIntent.getBroadcast(
                context,
                sessionId,
                intent,
                flags
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

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
                val manageIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(manageIntent)
                promise.reject("PERMISSION_REQUIRED", "Harap berikan izin instalasi aplikasi tidak dikenal untuk GrocyLite.")
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
        if (context == null || intent == null) return

        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                // When OS requires user consent, launch confirmation activity
                val confirmIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_INTENT)
                }
                confirmIntent?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(it)
                }
            }
            PackageInstaller.STATUS_SUCCESS -> {
                // App will be updated and restarted
            }
            else -> {
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                android.util.Log.w("SilentInstaller", "PackageInstaller failed status=$status msg=$msg")
            }
        }
    }
}
