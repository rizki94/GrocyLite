import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  StatusBar,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send,
  Image as ImageIcon,
  ArrowLeft,
  Receipt,
  Package,
  X,
  Bot,
  Play,
  FileText,
  Download,
  Volume2,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { launchImageLibrary } from 'react-native-image-picker';
import moment from 'moment';
import {
  getMessages,
  sendMessage,
  uploadAttachment,
  markConversationRead,
  Message,
} from '../../services/chat-api';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useChatUser } from '../../hooks/use-chat-user';
import { MarkdownTable, isMarkdownTable } from '../../components/chat/markdown-table';

interface ChatDetailScreenProps {
  route: any;
  navigation: any;
}

export function ChatDetailScreen({ route, navigation }: ChatDetailScreenProps) {
  const { conversationId, title, avatar } = route.params || {};
  const { isDark } = useAppTheme();
  const { currentUser } = useChatUser();
  const insets = useSafeAreaInsets();

  // Messages stored in NEWEST-FIRST order (index 0 = newest message at visual bottom)
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputContent, setInputContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  const fetchMessagesList = async (silent = false) => {
    try {
      const data = await getMessages(conversationId);
      // getMessages returns oldest-first. Reverse so index 0 = newest message for inverted FlatList
      setMessages(data.slice().reverse());
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessagesList();
    markConversationRead(conversationId);
    const interval = setInterval(() => fetchMessagesList(true), 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = async () => {
    if (!inputContent.trim() && !selectedImage) return;

    const textToSend = inputContent.trim();
    const imageToSend = selectedImage;

    // Clear input & preview immediately
    setInputContent('');
    setSelectedImage(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversationId,
      senderId: String(currentUser?.id || ''),
      senderUsername: currentUser?.username || '',
      senderDisplayName: currentUser?.name || currentUser?.full_name || 'Me',
      type: imageToSend ? 'image' : 'text',
      content: textToSend || null,
      mediaUrl: imageToSend ? imageToSend.uri : null,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isSending: true,
    };

    // Prepend optimistic message to index 0 (which is the bottom of inverted list)
    setMessages(prev => [optimisticMsg, ...prev]);
    setSending(true);

    // Force scroll to visual bottom (offset 0 in inverted list) even if user was scrolled up in history
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 50);

    try {
      let mediaData: any = null;

      if (imageToSend) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', {
          uri: imageToSend.uri,
          name: imageToSend.fileName || `chat_${Date.now()}.jpg`,
          type: imageToSend.type || 'image/jpeg',
        } as any);

        const uploadRes = await uploadAttachment(formData);
        mediaData = {
          mediaUrl: uploadRes.url,
          mediaType: 'image',
          mediaName: uploadRes.filename,
          mediaSize: uploadRes.size,
        };
        setUploading(false);
      }

      await sendMessage(conversationId, {
        type: mediaData ? 'image' : 'text',
        content: textToSend || undefined,
        ...mediaData,
      });

      // Refetch and update state in newest-first order
      const confirmed = await getMessages(conversationId);
      setMessages(confirmed.slice().reverse());
    } catch (e) {
      // Mark optimistic message as error
      setMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, isSending: false, status: 'error' as const } : m))
      );
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
      if (result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0]);
      }
    } catch (e) {
      console.error('Image picker error', e);
    }
  };

  // Colors
  const bg = isDark ? '#0f0f0f' : '#f0f4f8';
  const headerBg = isDark ? '#18181b' : '#059669';
  const inputBg = isDark ? '#18181b' : '#ffffff';
  const inputBorder = isDark ? '#27272a' : '#e4e4e7';
  const myBubbleBg = '#059669';
  const theirBubbleBg = isDark ? '#27272a' : '#ffffff';
  const textPrimary = isDark ? '#ffffff' : '#09090b';

  const formatDateDivider = (dateStr: string) => {
    const m = moment(dateStr);
    if (m.isSame(moment(), 'day')) return 'Today';
    if (m.isSame(moment().subtract(1, 'day'), 'day')) return 'Yesterday';
    return m.format('D MMMM YYYY');
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const isSystemUser =
      String(item.senderId) === 'system' ||
      item.senderUsername === 'system' ||
      (!item.senderId && item.type === 'text');

    const isMe = !isSystemUser && String(item.senderId) === String(currentUser?.id);
    const hasTable = isMarkdownTable(item.content || '');

    // Short system status log (< 60 chars, single line, no table, no event) -> render as small centered status pill badge
    const isShortSystemPill =
      isSystemUser &&
      item.type !== 'event_share' &&
      !hasTable &&
      (item.content || '').length < 60 &&
      !(item.content || '').includes('\n');

    // In newest-first order, index + 1 is the message created BEFORE this item
    const earlierItem = messages[index + 1];

    // Date Divider: show if this item starts a new day compared to the earlier message
    const currentDateLabel = formatDateDivider(item.createdAt);
    const earlierDateLabel = earlierItem ? formatDateDivider(earlierItem.createdAt) : null;
    const showDateDivider = !earlierItem || currentDateLabel !== earlierDateLabel;

    // Sender Grouping: hide sender avatar/name if earlier message was from same sender on same day
    const isSameSenderAsEarlier =
      earlierItem &&
      String(earlierItem.senderId) === String(item.senderId) &&
      currentDateLabel === earlierDateLabel &&
      !isShortSystemPill &&
      earlierItem.type !== 'text';

    const showAvatar = !isMe && !isShortSystemPill && !isSameSenderAsEarlier;
    const showSenderName = !isMe && !isShortSystemPill && !isSameSenderAsEarlier;

    if (isShortSystemPill) {
      return (
        <View key={item.id}>
          {showDateDivider && (
            <View style={styles.dateDividerWrap}>
              <View style={[styles.dateDividerPill, { backgroundColor: isDark ? '#27272a' : '#e2e8f0' }]}>
                <Text style={[styles.dateDividerText, { color: isDark ? '#a1a1aa' : '#64748b' }]}>
                  {currentDateLabel}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.systemRow}>
            <View
              style={[
                styles.systemBubble,
                { backgroundColor: isDark ? '#27272a' : '#e4e4e7' },
              ]}>
              <Text
                style={[
                  styles.systemText,
                  { color: isDark ? '#a1a1aa' : '#71717a' },
                ]}>
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    const senderDisplayName = isSystemUser ? 'Notifikasi Sistem' : (item.senderDisplayName || item.senderUsername || 'User');
    const bubbleMaxWidth = (hasTable || item.type === 'event_share') ? '92%' : '80%';
    const isVideo = item.type === 'video' || item.mediaType?.startsWith('video') || (item.mediaUrl && item.mediaUrl.match(/\.(mp4|webm|mov|mkv)(\?|$)/i));

    return (
      <View key={item.id}>
        {showDateDivider && (
          <View style={styles.dateDividerWrap}>
            <View style={[styles.dateDividerPill, { backgroundColor: isDark ? '#27272a' : '#e2e8f0' }]}>
              <Text style={[styles.dateDividerText, { color: isDark ? '#a1a1aa' : '#64748b' }]}>
                {currentDateLabel}
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageRow,
            { justifyContent: isMe ? 'flex-end' : 'flex-start' },
          ]}>
          {/* Their avatar — left side */}
          {!isMe && (
            <View style={{ width: 30, marginRight: 6 }}>
              {showAvatar ? (
                isSystemUser ? (
                  <View style={[styles.avatarSmall, { backgroundColor: '#10b981' }]}>
                    <Bot size={16} color="#ffffff" />
                  </View>
                ) : item.senderAvatar ? (
                  <Image
                    source={{ uri: item.senderAvatar }}
                    style={styles.avatarSmallImage}
                  />
                ) : (
                  <View style={[styles.avatarSmall, { backgroundColor: '#059669' }]}>
                    <Text style={styles.avatarSmallText}>
                      {String(senderDisplayName).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )
              ) : null}
            </View>
          )}

          <View
            style={[
              styles.bubble,
              isMe ? styles.myBubble : styles.theirBubble,
              {
                maxWidth: bubbleMaxWidth,
                backgroundColor: isMe ? myBubbleBg : theirBubbleBg,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 4,
                elevation: 1,
              },
            ]}>
            {/* Sender name */}
            {showSenderName && (
              <Text style={[styles.senderName, isSystemUser && { color: '#059669' }]}>
                {senderDisplayName}
              </Text>
            )}

            {/* Image attachment */}
            {item.mediaUrl && item.type === 'image' && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setViewingImageUrl(item.mediaUrl || null)}>
                <Image
                  source={{ uri: item.mediaUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {/* Video attachment */}
            {item.mediaUrl && isVideo && (
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setViewingVideoUrl(item.mediaUrl || null)}
                style={styles.videoCard}>
                <View style={styles.videoOverlay}>
                  <View style={styles.playBtnCircle}>
                    <Play size={22} color="#ffffff" style={{ marginLeft: 2 }} />
                  </View>
                  <Text style={styles.videoTitle} numberOfLines={1}>
                    {item.mediaName || 'Putar Video'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Document attachment */}
            {item.mediaUrl && item.type === 'document' && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (item.mediaUrl) {
                    Linking.openURL(item.mediaUrl).catch(() => {
                      Alert.alert('File', item.mediaName || 'Lampiran Dokumen');
                    });
                  }
                }}
                style={[
                  styles.documentCard,
                  { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                ]}>
                <FileText size={24} color={isMe ? '#ffffff' : '#059669'} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.docName, { color: isMe ? '#ffffff' : textPrimary }]} numberOfLines={1}>
                    {item.mediaName || 'Dokumen'}
                  </Text>
                  <Text style={[styles.docSize, { color: isMe ? 'rgba(255,255,255,0.7)' : '#71717a' }]}>
                    {item.mediaSize ? `${(item.mediaSize / 1024 / 1024).toFixed(2)} MB` : 'File'}
                  </Text>
                </View>
                <Download size={16} color={isMe ? '#ffffff' : '#059669'} />
              </TouchableOpacity>
            )}

            {/* Audio attachment */}
            {item.mediaUrl && item.type === 'audio' && (
              <View
                style={[
                  styles.documentCard,
                  { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }
                ]}>
                <Volume2 size={24} color={isMe ? '#ffffff' : '#059669'} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.docName, { color: isMe ? '#ffffff' : textPrimary }]} numberOfLines={1}>
                    {item.mediaName || 'Pesan Suara'}
                  </Text>
                </View>
              </View>
            )}

            {/* Event notification card */}
            {item.type === 'event_share' && (
              <View
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: isMe
                      ? 'rgba(255,255,255,0.15)'
                      : isDark
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.05)',
                  },
                ]}>
                <View style={styles.eventCardHeader}>
                  {item.eventType === 'transaction' ? (
                    <Receipt size={13} color={isMe ? '#fff' : '#059669'} />
                  ) : (
                    <Package size={13} color={isMe ? '#fff' : '#3b82f6'} />
                  )}
                  <Text
                    style={[
                      styles.eventType,
                      { color: isMe ? 'rgba(255,255,255,0.8)' : '#059669' },
                    ]}>
                    {item.eventType === 'goods_receipt' || item.eventType === 'goods_receipt_synced'
                      ? 'Penerimaan Barang'
                      : item.eventType === 'transaction'
                      ? 'Transaksi'
                      : item.eventType}
                  </Text>
                  {item.eventType === 'goods_receipt_synced' && (
                    <Text style={{ fontSize: 10, fontWeight: '700', color: isMe ? '#86efac' : '#059669', marginLeft: 'auto' }}>
                      ✓ Sudah Sync
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.eventId,
                    { color: isMe ? '#fff' : textPrimary },
                  ]}>
                  {item.eventId}
                </Text>
              </View>
            )}

            {/* Text or Table content */}
            {!!item.content && (
              isMarkdownTable(item.content) ? (
                <MarkdownTable content={item.content} isMe={isMe} isDark={isDark} />
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    { color: isMe ? '#ffffff' : textPrimary },
                  ]}>
                  {item.content}
                </Text>
              )
            )}

            {/* Timestamp & sending indicator */}
            <View style={styles.timeRow}>
              <Text
                style={[
                  styles.messageTime,
                  { color: isMe ? 'rgba(255,255,255,0.65)' : '#a1a1aa' },
                ]}>
                {moment(item.createdAt).format('HH:mm')}
              </Text>
              {item.isSending && (
                <ActivityIndicator
                  size="small"
                  color={isMe ? '#ffffff' : '#059669'}
                  style={{ marginLeft: 4, transform: [{ scale: 0.6 }] }}
                />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const canSend =
    (inputContent.trim().length > 0 || !!selectedImage) &&
    !sending &&
    !uploading;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: headerBg }]} edges={['top']}>
      <StatusBar
        backgroundColor={headerBg}
        barStyle="light-content"
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>

        {/* Avatar in header */}
        <View style={[styles.headerAvatar, { overflow: 'hidden' }]}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{ width: 38, height: 38, borderRadius: 19 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.headerAvatarText}>
              {(title || '?').charAt(0).toUpperCase()}
            </Text>
          )}
        </View>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Content area */}
      <KeyboardAvoidingView
        style={[styles.keyboardView, { backgroundColor: bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* Messages */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={item => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageList}
          />
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <View
            style={[
              styles.imagePreview,
              { backgroundColor: inputBg, borderTopColor: inputBorder },
            ]}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreviewThumb}
            />
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={{ marginLeft: 'auto', padding: 6 }}>
              <X size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: inputBg,
              borderTopColor: inputBorder,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}>
          <TouchableOpacity
            onPress={handlePickImage}
            style={styles.attachBtn}
            disabled={uploading}>
            <ImageIcon size={22} color={isDark ? '#a1a1aa' : '#71717a'} />
          </TouchableOpacity>

          <TextInput
            value={inputContent}
            onChangeText={setInputContent}
            placeholder="Type a message..."
            placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
            multiline
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? '#27272a' : '#f4f4f5',
                color: isDark ? '#ffffff' : '#09090b',
              },
            ]}
          />

          <TouchableOpacity
            disabled={!canSend}
            onPress={handleSend}
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? '#059669' : isDark ? '#27272a' : '#e4e4e7' },
            ]}>
            {sending || uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send
                size={18}
                color={canSend ? '#fff' : isDark ? '#52525b' : '#a1a1aa'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Full-Screen Picture Viewer Modal with Pinch-to-Zoom */}
      <Modal
        visible={!!viewingImageUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImageUrl(null)}>
        <View style={styles.mediaViewerContainer}>
          <StatusBar backgroundColor="#000000" barStyle="light-content" />
          <TouchableOpacity
            style={[styles.mediaViewerCloseBtn, { top: insets.top > 0 ? insets.top + 10 : 20 }]}
            onPress={() => setViewingImageUrl(null)}
            activeOpacity={0.7}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {viewingImageUrl && (
            <ScrollView
              contentContainerStyle={styles.zoomScrollContainer}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent={true}>
              <Image
                source={{ uri: viewingImageUrl }}
                style={styles.mediaViewerImage}
                resizeMode="contain"
              />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Full-Screen Video Player Modal */}
      <Modal
        visible={!!viewingVideoUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingVideoUrl(null)}>
        <View style={styles.mediaViewerContainer}>
          <StatusBar backgroundColor="#000000" barStyle="light-content" />
          <TouchableOpacity
            style={[styles.mediaViewerCloseBtn, { top: insets.top > 0 ? insets.top + 10 : 20, zIndex: 99 }]}
            onPress={() => setViewingVideoUrl(null)}
            activeOpacity={0.7}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {viewingVideoUrl && (
            <WebView
              style={{ flex: 1, backgroundColor: '#000000' }}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
                    <style>
                      body { margin:0; padding:0; background:#000; display:flex; justify-content:center; align-items:center; height:100vh; }
                      video { width:100%; height:100%; object-fit:contain; }
                    </style>
                  </head>
                  <body>
                    <video src="${viewingVideoUrl}" controls autoplay playsinline></video>
                  </body>
                  </html>
                `
              }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  keyboardView: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 4,
  },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemBubble: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  systemText: { fontSize: 11, fontWeight: '500' },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
    gap: 6,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarSmallText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarSmallImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  dateDividerWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateDividerPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 3,
  },
  messageImage: {
    width: 210,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
  },
  videoCard: {
    width: 210,
    height: 125,
    borderRadius: 10,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  videoOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  playBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(5, 150, 105, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  videoTitle: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
    minWidth: 180,
  },
  docName: {
    fontSize: 12,
    fontWeight: '700',
  },
  docSize: {
    fontSize: 10,
  },
  eventCard: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    gap: 4,
  },
  eventCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventType: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  eventId: { fontSize: 12, fontWeight: '600' },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  messageTime: {
    fontSize: 10,
    textAlign: 'right',
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  imagePreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  attachBtn: {
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    maxHeight: 120,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  mediaViewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  mediaViewerCloseBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 999,
    padding: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  zoomScrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaViewerImage: {
    width: '100%',
    height: '100%',
  },
});
