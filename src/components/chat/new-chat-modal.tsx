import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Search, X, User, Users, Check } from 'lucide-react-native';
import {
  getUsers,
  createConversation,
  UserItem,
  Conversation,
} from '../../services/chat-api';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useChatUser } from '../../hooks/use-chat-user';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectConversation: (conv: Conversation) => void;
}

export function NewChatModal({
  visible,
  onClose,
  onSelectConversation,
}: NewChatModalProps) {
  const { isDark } = useAppTheme();
  const { currentUser } = useChatUser();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Group creation mode
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<(string | number)[]>(
    [],
  );

  useEffect(() => {
    if (visible) {
      fetchDirectory();
      setIsGroupMode(false);
      setGroupName('');
      setSelectedUserIds([]);
      setSearch('');
    }
  }, [visible]);

  const fetchDirectory = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      // Filter out current user
      const filtered = data.filter(
        u => String(u.id) !== String(currentUser?.id),
      );
      setUsers(filtered);
    } catch (e) {
      console.error('Failed to fetch users directory', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrivateUser = async (user: UserItem) => {
    setCreating(true);
    try {
      const conv = await createConversation({
        type: 'private',
        participantIds: [user.id],
      });
      onSelectConversation(conv);
      onClose();
    } catch (e) {
      console.error('Failed to create private conversation', e);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUserIds.length === 0 || !groupName.trim()) return;
    setCreating(true);
    try {
      const conv = await createConversation({
        type: 'group',
        name: groupName.trim(),
        participantIds: selectedUserIds,
      });
      onSelectConversation(conv);
      onClose();
    } catch (e) {
      console.error('Failed to create group conversation', e);
    } finally {
      setCreating(false);
    }
  };

  const toggleSelectUser = (id: string | number) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter(item => item !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const getUserDisplayName = (u: UserItem) => {
    return u?.displayName || u?.full_name || u?.name || u?.username || 'User';
  };

  const filteredUsers = users.filter(u => {
    const term = (search || '').toLowerCase();
    const displayName = (u?.displayName || '').toLowerCase();
    const username = (u?.username || '').toLowerCase();
    const fullName = (u?.full_name || '').toLowerCase();
    const name = (u?.name || '').toLowerCase();
    const division = (u?.division || '').toLowerCase();
    return (
      displayName.includes(term) ||
      username.includes(term) ||
      fullName.includes(term) ||
      name.includes(term) ||
      division.includes(term)
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className={`h-5/6 rounded-t-3xl p-5 ${
            isDark ? 'bg-zinc-900' : 'bg-white'
          }`}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <Text
              className={`text-lg font-bold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              {isGroupMode ? 'Create Group Chat' : 'New Chat'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800"
            >
              <X size={20} color={isDark ? '#fff' : '#18181b'} />
            </TouchableOpacity>
          </View>

          {/* Toggle Group Mode */}
          <View className="flex-row my-3 gap-2">
            <TouchableOpacity
              onPress={() => setIsGroupMode(false)}
              className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-2 ${
                !isGroupMode
                  ? isDark
                    ? 'bg-emerald-600'
                    : 'bg-emerald-500'
                  : isDark
                    ? 'bg-zinc-800'
                    : 'bg-zinc-100'
              }`}
            >
              <User
                size={16}
                color={!isGroupMode ? '#fff' : isDark ? '#a1a1aa' : '#71717a'}
              />
              <Text
                className={`text-xs font-semibold ${
                  !isGroupMode
                    ? 'text-white'
                    : isDark
                      ? 'text-zinc-400'
                      : 'text-zinc-600'
                }`}
              >
                Direct Message
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsGroupMode(true)}
              className={`flex-1 py-2 rounded-xl flex-row items-center justify-center gap-2 ${
                isGroupMode
                  ? isDark
                    ? 'bg-emerald-600'
                    : 'bg-emerald-500'
                  : isDark
                    ? 'bg-zinc-800'
                    : 'bg-zinc-100'
              }`}
            >
              <Users
                size={16}
                color={isGroupMode ? '#fff' : isDark ? '#a1a1aa' : '#71717a'}
              />
              <Text
                className={`text-xs font-semibold ${
                  isGroupMode
                    ? 'text-white'
                    : isDark
                      ? 'text-zinc-400'
                      : 'text-zinc-600'
                }`}
              >
                Group Chat
              </Text>
            </TouchableOpacity>
          </View>

          {/* Group Name Input if Group Mode */}
          {isGroupMode && (
            <View className="mb-3">
              <TextInput
                placeholder="Group Name (e.g. Project Alpha)..."
                placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
                value={groupName}
                onChangeText={setGroupName}
                className={`px-4 py-3 rounded-xl border text-sm font-medium ${
                  isDark
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-900'
                }`}
              />
            </View>
          )}

          {/* Search Input */}
          <View
            className={`flex-row items-center px-3 py-2.5 rounded-xl border mb-3 ${
              isDark
                ? 'bg-zinc-800 border-zinc-700'
                : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <Search size={18} color={isDark ? '#a1a1aa' : '#71717a'} />
            <TextInput
              placeholder="Search user or division..."
              placeholderTextColor={isDark ? '#71717a' : '#a1a1aa'}
              value={search}
              onChangeText={setSearch}
              className={`flex-1 ml-2 text-sm ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            />
          </View>

          {/* Users List */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#059669" />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedUserIds.includes(item.id);
                return (
                  <TouchableOpacity
                    disabled={creating}
                    onPress={() =>
                      isGroupMode
                        ? toggleSelectUser(item.id)
                        : handleSelectPrivateUser(item)
                    }
                    className={`flex-row items-center justify-between p-3 rounded-xl mb-2 border ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isDark
                          ? 'bg-zinc-800/40 border-zinc-800'
                          : 'bg-zinc-50 border-zinc-100'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-emerald-600 justify-center items-center overflow-hidden">
                        {(item.avatar || item.avatar_img) ? (
                          <Image
                            source={{ uri: item.avatar || item.avatar_img }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Text className="text-white font-bold text-sm">
                            {getUserDisplayName(item).charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View>
                        <Text
                          className={`font-semibold text-sm ${
                            isDark ? 'text-white' : 'text-zinc-900'
                          }`}
                        >
                          {getUserDisplayName(item)}
                        </Text>
                        {item.division && (
                          <Text className="text-xs text-emerald-500 font-medium">
                            {item.division}
                          </Text>
                        )}
                      </View>
                    </View>

                    {isGroupMode && (
                      <View
                        className={`w-6 h-6 rounded-full border justify-center items-center ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500'
                            : isDark
                              ? 'border-zinc-700'
                              : 'border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check size={14} color="#fff" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Group Mode Confirm Button */}
          {isGroupMode && (
            <TouchableOpacity
              disabled={
                creating || selectedUserIds.length === 0 || !groupName.trim()
              }
              onPress={handleCreateGroup}
              className={`py-3.5 rounded-xl items-center mt-3 ${
                selectedUserIds.length > 0 && groupName.trim()
                  ? 'bg-emerald-600'
                  : isDark
                    ? 'bg-zinc-800'
                    : 'bg-zinc-200'
              }`}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  className={`font-bold text-sm ${
                    selectedUserIds.length > 0 && groupName.trim()
                      ? 'text-white'
                      : 'text-zinc-500'
                  }`}
                >
                  Create Group ({selectedUserIds.length} members)
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
