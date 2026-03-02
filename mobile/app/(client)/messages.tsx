import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{
    orderId: string;
    livreurNom: string;
  }>();

  const orderId = params.orderId || '';
  const livreurNom = params.livreurNom || 'Livreur';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!orderId) return;

    const messagesRef = collection(db, 'commandes', orderId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Message[];

      setMessages(fetchedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || !user || !orderId) return;

    setSending(true);
    setInputText('');

    try {
      const messagesRef = collection(db, 'commandes', orderId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderName: profile
          ? `${profile.prenom} ${profile.nom}`
          : 'Client',
        text: trimmedText,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(trimmedText); // Restore text on failure
    } finally {
      setSending(false);
    }
  }, [inputText, user, orderId, profile]);

  const formatTime = (timestamp: Timestamp | null): string => {
    if (!timestamp) return '';
    try {
      const date =
        typeof timestamp.toDate === 'function'
          ? timestamp.toDate()
          : new Date();
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const isMyMessage = (senderId: string): boolean => {
    return senderId === user?.uid;
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMine = isMyMessage(item.senderId);

    // Show date separator if different day from previous message
    let showDateSeparator = index === 0;
    if (!showDateSeparator && item.createdAt && messages[index - 1]?.createdAt) {
      try {
        const currentDate = item.createdAt.toDate?.()
          ? item.createdAt.toDate().toDateString()
          : '';
        const prevDate = messages[index - 1].createdAt.toDate?.()
          ? messages[index - 1].createdAt.toDate().toDateString()
          : '';
        showDateSeparator = currentDate !== prevDate;
      } catch {
        showDateSeparator = false;
      }
    }

    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>
              {item.createdAt?.toDate
                ? item.createdAt.toDate().toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  })
                : "Aujourd'hui"}
            </Text>
            <View style={styles.dateLine} />
          </View>
        )}

        <View
          style={[
            styles.bubbleContainer,
            isMine ? styles.bubbleContainerRight : styles.bubbleContainerLeft,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs,
              ]}
            >
              {item.text}
            </Text>
            <Text
              style={[
                styles.bubbleTime,
                isMine ? styles.bubbleTimeMine : styles.bubbleTimeTheirs,
              ]}
            >
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyChatContainer}>
      <Ionicons
        name="chatbubbles-outline"
        size={64}
        color={Colors.border}
      />
      <Text style={styles.emptyChatTitle}>Aucun message</Text>
      <Text style={styles.emptyChatSubtitle}>
        Envoyez un message au livreur pour démarrer la conversation.
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{livreurNom}</Text>
          <Text style={styles.headerOrderId}>
            Commande #{orderId.slice(0, 8)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.messagesListEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyChat}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Votre message..."
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="send" size={20} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  headerOrderId: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: Spacing.base,
    paddingBottom: Spacing.md,
  },
  messagesListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.base,
    gap: Spacing.sm,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dateText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  bubbleContainer: {
    marginBottom: Spacing.sm,
    maxWidth: '80%',
  },
  bubbleContainerRight: {
    alignSelf: 'flex-end',
  },
  bubbleContainerLeft: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: BorderRadius.sm,
  },
  bubbleTheirs: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: BorderRadius.sm,
    ...Shadows.card,
  },
  bubbleText: {
    fontSize: Typography.sizes.base,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: Colors.white,
  },
  bubbleTextTheirs: {
    color: Colors.text,
  },
  bubbleTime: {
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  bubbleTimeMine: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  bubbleTimeTheirs: {
    color: Colors.textLight,
  },
  emptyChatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyChatTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.base,
  },
  emptyChatSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 0,
    minHeight: 44,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 0 : Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});
