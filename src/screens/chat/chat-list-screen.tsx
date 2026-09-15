import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  MessageSquarePlus,
  Users,
  Globe,
  Headphones,
} from 'lucide-react-native';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConversations, Conversation } from '../../services/chat-api';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useChatUser } from '../../hooks/use-chat-user';
import { NewChatModal } from '../../components/chat/new-chat-modal';

const CS_MODE_KEY = '@chat_cs_mode_active';

interface ChatListScreenProps {
  navigation: any;
}

export function ChatListScreen({ navigation }: ChatListScreenProps) {
  const { isDark } = useAppTheme();
  const { currentUser } = useChatUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [csFilterActive, setCsFilterActive] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  // Load API base URL
  useEffect(() => {
    AsyncStorage.getItem('@url').then(url => {
      if (url) setApiBaseUrl(url);
    });
  }, []);

  // Load CS Mode state from AsyncStorage
  useEffect(() => {
    async function loadCsState() {
      try {
        const saved = await AsyncStorage.getItem(CS_MODE_KEY);
        if (saved !== null) {
          setCsFilterActive(JSON.parse(saved));
        }
      } catch (e) {
        // silent fail
      }
    }
    loadCsState();
  }, []);

  const toggleCsFilter = async () => {
    const nextState = !csFilterActive;
    setCsFilterActive(nextState);
    try {
      await AsyncStorage.setItem(CS_MODE_KEY, JSON.stringify(nextState));
    } catch (e) {
      // silent fail
    }
  };

  const fetchConversationsList = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversationsList();
      const interval = setInterval(fetchConversationsList, 6000);
      return () => clearInterval(interval);
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversationsList();
  };

  const getConversationTitle = (conv: Conversation): string => {
    if (conv.type === 'group') return conv.name || 'Group Chat';

    // 1. Customer User (WhatsApp Customer)
    const waCustomer = conv.participants?.find(p => p.username?.startsWith('wa_'));
    if (waCustomer) {
      return waCustomer.displayName || waCustomer.username || 'Customer';
    }

    // 2. System User (AI Analytic / AI Business Analyst)
    const aiParticipant = conv.participants?.find(
      p => p.username === 'ai_analyst' || p.username === 'ai_analytic',
    );
    if (aiParticipant) return 'AI Business Analyst';

    // 3. Regular Staff User
    const other =
      conv.participants?.find(
        p =>
          p.username !== 'ai_analyst' &&
          p.username !== 'ai_analytic' &&
          String(p.id) !== String(currentUser?.id),
      ) ||
      conv.participants?.find(
        p => p.username !== 'ai_analyst' && p.username !== 'ai_analytic',
      ) ||
      conv.participants?.[0];

    return other
      ? String(other.displayName || other.username || 'Unknown')
      : 'Chat';
  };

  // Adapted from web ConversationList.tsx — includes "You: " prefix and media labels
  const getConversationSubtitle = (conv: Conversation): string => {
    const msg = conv.lastMessage;
    if (!msg) return 'No messages yet';
    if (msg.isDeleted) return 'This message was deleted';

    const isMe = String(msg.senderId) === String(currentUser?.id);
    const prefix = isMe ? 'You: ' : '';

    switch (msg.type) {
      case 'image':
        return `${prefix}📷 Photo`;
      case 'video':
        return `${prefix}🎥 Video`;
      case 'audio':
        return `${prefix}🎵 Audio`;
      case 'document':
        return `${prefix}📄 File`;
      case 'event_share':
        return `${prefix}📌 Event Notification`;
      default:
        return `${prefix}${msg.content || ''}`;
    }
  };

  const getAvatarInitial = (title: string) =>
    title.charAt(0).toUpperCase() || '?';

  const getAvatarColors = (conv: Conversation) => {
    const isGlobal = conv.name === 'Global Chat';
    const isDivision = conv.name?.startsWith('Divisi ');
    if (isGlobal) return { bg: '#f59e0b', text: '#fff' };
    if (isDivision) return { bg: '#6366f1', text: '#fff' };
    if (conv.type === 'group') return { bg: '#10b981', text: '#fff' };
    return { bg: '#059669', text: '#fff' };
  };

  // Build avatar URL same as web frontend
  const getAvatarUrl = (rawAvatar: string | null | undefined): string | null => {
    if (!rawAvatar) return null;
    if (rawAvatar.startsWith('http')) return rawAvatar;
    const base = apiBaseUrl || '';
    const path = rawAvatar.startsWith('/')
      ? rawAvatar
      : `/uploads/avatar/${rawAvatar}`;
    return `${base}${path}`;
  };

  const hasCsPermission = !!currentUser?.is_cs;

  // Filter conversations — same logic as web ChatPage and tab navigator
  const filteredConversations = conversations.filter(c => {
    const isWaCustomer = c.participants?.some(p => p.username?.startsWith('wa_'));
    if (hasCsPermission) {
      if (csFilterActive && !isWaCustomer) return false;
      if (!csFilterActive && isWaCustomer) return false;
    } else {
      // Users without CS permission never see WA customer chats
      if (isWaCustomer) return false;
    }
    const title = getConversationTitle(c);
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const bg = isDark ? '#0f0f0f' : '#ffffff';
  const dividerColor = isDark ? '#27272a' : '#e4e4e7';
  const textPrimary = isDark ? '#ffffff' : '#09090b';
  const textSecondary = isDark ? '#a1a1aa' : '#71717a';
  const searchBg = isDark ? '#18181b' : '#f4f4f5';
  const unreadColor = '#059669';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: dividerColor }]}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>
          Messages
        </Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.newChatBtn, { backgroundColor: unreadColor }]}>
          <MessageSquarePlus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* CS Mode Toggle Banner (shown if user is CS staff) */}
      {hasCsPermission && (
        <View
          style={[
            styles.csBanner,
            {
              backgroundColor: csFilterActive
                ? isDark
                  ? 'rgba(16, 185, 129, 0.15)'
                  : '#dcfce7'
                : isDark
                ? '#18181b'
                : '#f4f4f5',
              borderBottomColor: dividerColor,
            },
          ]}>
          <View style={styles.csBannerLeft}>
            <Headphones
              size={16}
              color={csFilterActive ? '#10b981' : textSecondary}
            />
            <Text
              style={[
                styles.csBannerText,
                { color: csFilterActive ? '#059669' : textSecondary },
              ]}>
              {csFilterActive ? 'Mode CS (Chat WA)' : 'Chat Internal'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleCsFilter}
            style={[
              styles.csToggleBtn,
              { backgroundColor: csFilterActive ? '#059669' : '#71717a' },
            ]}>
            <Text style={styles.csToggleBtnText}>
              {csFilterActive ? 'Nonaktifkan' : 'Aktifkan CS'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Bar */}
      <View style={[styles.searchWrap, { backgroundColor: searchBg }]}>
        <Search size={16} color={textSecondary} />
        <TextInput
          placeholder="Search conversations..."
          placeholderTextColor={textSecondary}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: textPrimary }]}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={unreadColor} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={unreadColor}
            />
          }
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: dividerColor, marginLeft: 76 },
              ]}
            />
          )}
          renderItem={({ item }) => {
            const title = getConversationTitle(item);
            const subtitle = getConversationSubtitle(item);
            const timeLabel = item.lastMessage?.createdAt
              ? moment(item.lastMessage.createdAt).format('HH:mm')
              : '';
            const { bg: avatarBg, text: avatarText } = getAvatarColors(item);
            const isGlobal = item.name === 'Global Chat';
            const isDivision = item.name?.startsWith('Divisi ');
            const isGroup = item.type === 'group';
            const isPrivate = item.type === 'private';
            const other = item.participants?.find(
              p => String(p.id) !== String(currentUser?.id),
            );
            const rawAvatar = item.type === 'group' ? item.avatar : other?.avatar;
            const avatarUrl = getAvatarUrl(rawAvatar);

            return (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ChatDetailScreen', {
                    conversationId: item.id,
                    title,
                    avatar: avatarUrl,
                    isGroup,
                    isPrivate,
                  })
                }
                activeOpacity={0.7}
                style={styles.row}>
                {/* Avatar */}
                <View
                  style={[styles.avatar, { backgroundColor: avatarBg, overflow: 'hidden' }]}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={{ width: 52, height: 52, borderRadius: 26 }}
                      resizeMode="cover"
                    />
                  ) : isGlobal ? (
                    <Globe size={22} color="#fff" />
                  ) : isGroup || isDivision ? (
                    <Users size={20} color="#fff" />
                  ) : (
                    <Text style={[styles.avatarText, { color: avatarText }]}>
                      {getAvatarInitial(title)}
                    </Text>
                  )}

                  {/* Unread badge on avatar */}
                  {item.unreadCount > 0 && (
                    <View style={styles.avatarBadge}>
                      <Text style={styles.avatarBadgeText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.rowTitle,
                        {
                          color: textPrimary,
                          fontWeight: item.unreadCount > 0 ? '700' : '600',
                        },
                      ]}>
                      {title}
                    </Text>
                    <Text
                      style={[
                        styles.rowTime,
                        {
                          color:
                            item.unreadCount > 0 ? unreadColor : textSecondary,
                        },
                      ]}>
                      {timeLabel}
                    </Text>
                  </View>

                  <View style={styles.rowBottom}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.rowSubtitle,
                        {
                          color:
                            item.unreadCount > 0 ? textPrimary : textSecondary,
                          fontWeight: item.unreadCount > 0 ? '600' : '400',
                          flex: 1,
                        },
                      ]}>
                      {subtitle}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <MessageSquarePlus size={40} color={textSecondary} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>
                No conversations yet
              </Text>
            </View>
          }
        />
      )}

      <NewChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectConversation={conv => {
          setModalVisible(false);
          const title = getConversationTitle(conv);
          navigation.navigate('ChatDetailScreen', {
            conversationId: conv.id,
            title,
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  csBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  csBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  csBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  csToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  csToggleBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  newChatBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 60,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Badge on avatar (like web's absolute badge on Avatar)
  avatarBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  avatarBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  rowTime: {
    fontSize: 11,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
