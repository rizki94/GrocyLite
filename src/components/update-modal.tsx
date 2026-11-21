import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useThemeColor } from '../lib/colors';
import {
  ArrowUpCircle,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Cpu,
  FolderDown,
} from 'lucide-react-native';
import {
  useUpdateStore,
  startUpdateDownload,
  cancelUpdateDownload,
  closeUpdateModal,
  triggerInstall,
} from '../hooks/use-auto-update';

export const UpdateModal: React.FC = () => {
  const colors = useThemeColor();
  const {
    showModal,
    phase,
    latestVersion,
    currentVersion,
    releaseNotes,
    abiLabel,
    downloadProgress,
    downloadedBytes,
    totalBytes,
    savedPath,
    errorMessage,
  } = useUpdateStore();

  if (!showModal) return null;

  const formatMB = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isDownloading = phase === 'downloading';
  const isDownloaded = phase === 'downloaded';
  const isError = phase === 'error';

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isDownloading) {
          closeUpdateModal();
        }
      }}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-5">
        <View className="bg-card w-full max-w-sm rounded-3xl border border-border p-6 shadow-2xl overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
                {isError ? (
                  <AlertCircle size={22} color={colors.destructive} />
                ) : isDownloaded ? (
                  <CheckCircle2 size={22} color={colors.green || '#10b981'} />
                ) : (
                  <ArrowUpCircle size={22} color={colors.primary} />
                )}
              </View>
              <View>
                <Text className="text-base font-black text-foreground">
                  {isError
                    ? 'Gagal Memperbarui'
                    : isDownloaded
                    ? 'Unduhan Selesai'
                    : isDownloading
                    ? 'Mengunduh Pembaruan'
                    : 'Pembaruan Tersedia'}
                </Text>
                <Text className="text-[11px] font-semibold text-muted-foreground">
                  GrocyLite v{latestVersion}
                </Text>
              </View>
            </View>

            {!isDownloading && (
              <TouchableOpacity
                onPress={closeUpdateModal}
                className="p-1.5 rounded-full bg-secondary/30 -mr-1"
              >
                <X size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          {/* Version & Device Badges */}
          <View className="flex-row items-center gap-2 mb-3 flex-wrap">
            <View className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <Text className="text-[10px] font-bold text-primary">
                v{currentVersion} → v{latestVersion}
              </Text>
            </View>
            {abiLabel ? (
              <View className="px-2 py-1 rounded-lg bg-secondary/30 border border-border/40 flex-row items-center gap-1">
                <Cpu size={10} color={colors.mutedForeground} />
                <Text className="text-[10px] font-mono text-muted-foreground uppercase">
                  {abiLabel}
                </Text>
              </View>
            ) : null}
            {totalBytes > 0 ? (
              <View className="px-2 py-1 rounded-lg bg-secondary/30 border border-border/40">
                <Text className="text-[10px] font-bold text-muted-foreground">
                  {formatMB(totalBytes)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Content based on phase */}
          {isDownloading ? (
            <View className="my-3 space-y-3">
              {/* Progress bar */}
              <View className="space-y-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs font-bold text-foreground">
                    Proses Download
                  </Text>
                  <Text className="text-xs font-mono font-black text-primary">
                    {downloadProgress}%
                  </Text>
                </View>

                {/* Bar */}
                <View className="h-3 w-full bg-secondary/40 rounded-full overflow-hidden border border-border/30">
                  <View
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.max(downloadProgress, 2)}%` }}
                  />
                </View>

                <View className="flex-row justify-between items-center pt-0.5">
                  <Text className="text-[10px] text-muted-foreground">
                    Unduh langsung dari GitHub...
                  </Text>
                  <Text className="text-[10px] font-mono text-muted-foreground font-semibold">
                    {formatMB(downloadedBytes)} / {formatMB(totalBytes)}
                  </Text>
                </View>
              </View>
            </View>
          ) : isDownloaded ? (
            /* Downloaded & Ready to Install */
            <View className="my-3 space-y-3">
              <View className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                <View className="flex-row items-center gap-2">
                  <CheckCircle2 size={16} color={colors.green || '#10b981'} />
                  <Text className="text-xs font-bold text-foreground">
                    Berkas APK siap dipasang!
                  </Text>
                </View>
                <Text className="text-[11px] text-muted-foreground leading-4">
                  Ketuk tombol di bawah untuk membuka jendela penginstal aplikasi Android.
                </Text>

                {savedPath ? (
                  <View className="pt-2 border-t border-border/30 flex-row items-center gap-1.5">
                    <FolderDown size={13} color={colors.mutedForeground} />
                    <Text className="text-[10px] font-mono text-muted-foreground flex-1" numberOfLines={1}>
                      {savedPath}
                    </Text>
                  </View>
                ) : null}
              </View>

              {errorMessage && (
                <Text className="text-[11px] text-destructive leading-4 px-1">
                  {errorMessage}
                </Text>
              )}
            </View>
          ) : isError ? (
            <View className="my-3 p-3 rounded-2xl bg-destructive/10 border border-destructive/20 space-y-1">
              <Text className="text-xs font-bold text-destructive">
                Terjadi Kesalahan:
              </Text>
              <Text className="text-[11px] text-destructive leading-4">
                {errorMessage || 'Gagal memproses pembaruan. Silakan coba kembali.'}
              </Text>
            </View>
          ) : (
            /* Ready / Available state: Changelog */
            <View className="my-2 space-y-2">
              <View className="flex-row items-center gap-1.5">
                <FileText size={12} color={colors.mutedForeground} />
                <Text className="text-xs font-bold text-foreground">
                  Catatan Rilis / Pembaruan:
                </Text>
              </View>
              <ScrollView
                className="max-h-36 p-3 rounded-2xl bg-secondary/15 border border-border/40"
                nestedScrollEnabled
              >
                <Text className="text-xs text-muted-foreground leading-relaxed">
                  {releaseNotes || 'Perbaikan performa dan kestabilan aplikasi.'}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View className="mt-4 pt-2 border-t border-border/30 flex-row gap-2.5">
            {isDownloading ? (
              <TouchableOpacity
                onPress={cancelUpdateDownload}
                className="flex-1 h-11 rounded-xl bg-destructive/15 border border-destructive/30 items-center justify-center active:bg-destructive/25"
              >
                <Text className="text-xs font-bold text-destructive">
                  Batalkan Unduhan
                </Text>
              </TouchableOpacity>
            ) : isDownloaded ? (
              <>
                <TouchableOpacity
                  onPress={closeUpdateModal}
                  className="flex-1 h-11 rounded-xl bg-secondary/30 border border-border/50 items-center justify-center active:bg-secondary/50"
                >
                  <Text className="text-xs font-bold text-foreground">Nanti</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={triggerInstall}
                  className="flex-[1.5] h-11 rounded-xl bg-emerald-600 items-center justify-center active:opacity-90 flex-row gap-1.5"
                >
                  <Download size={14} color="#ffffff" />
                  <Text className="text-xs font-black text-white">
                    Pasang Sekarang
                  </Text>
                </TouchableOpacity>
              </>
            ) : isError ? (
              <>
                <TouchableOpacity
                  onPress={closeUpdateModal}
                  className="flex-1 h-11 rounded-xl bg-secondary/30 border border-border/50 items-center justify-center active:bg-secondary/50"
                >
                  <Text className="text-xs font-bold text-foreground">Tutup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={startUpdateDownload}
                  className="flex-1 h-11 rounded-xl bg-primary items-center justify-center active:opacity-90"
                >
                  <Text className="text-xs font-black text-white">Coba Lagi</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={closeUpdateModal}
                  className="flex-1 h-11 rounded-xl bg-secondary/30 border border-border/50 items-center justify-center active:bg-secondary/50"
                >
                  <Text className="text-xs font-bold text-foreground">Nanti</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={startUpdateDownload}
                  className="flex-1 h-11 rounded-xl bg-primary items-center justify-center active:opacity-90 flex-row gap-1.5"
                >
                  <Download size={14} color="#ffffff" />
                  <Text className="text-xs font-black text-white">
                    Perbarui Sekarang
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
