import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  warning: '#F39C12',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

interface Message {
  text: string;
  senderId: string;
  createdAt: string;
}

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isOwn }) => {
  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.containerOwn : styles.containerOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.messageTextOwn : styles.messageTextOther,
          ]}
        >
          {message.text}
        </Text>
      </View>
      <Text
        style={[
          styles.timestamp,
          isOwn ? styles.timestampOwn : styles.timestampOther,
        ]}
      >
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '78%',
    paddingHorizontal: 12,
  },
  containerOwn: {
    alignSelf: 'flex-end',
  },
  containerOther: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleOwn: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 16,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: COLORS.white,
  },
  messageTextOther: {
    color: COLORS.text,
  },
  timestamp: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  timestampOwn: {
    textAlign: 'right',
  },
  timestampOther: {
    textAlign: 'left',
  },
});

export default ChatBubble;
