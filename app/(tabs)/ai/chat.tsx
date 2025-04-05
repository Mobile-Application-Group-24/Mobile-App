import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StatusBar, SafeAreaView, Keyboard } from 'react-native';
import { Send, ThumbsUp, CheckCircle } from 'lucide-react-native';
import { sendMessageToDeepseek, updateNutritionData, addWorkoutEntry } from '@/utils/deepseek';
import { useSession } from '@/utils/auth';
import Markdown from 'react-native-markdown-display';
import { TAB_BAR_HEIGHT } from '../_layout';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  role?: 'user' | 'assistant' | 'system';
  suggestions?: Suggestion[];
};

type Suggestion = {
  id: string;
  type: 'nutrition' | 'workout';
  title: string;
  data: any;
  accepted?: boolean;
};

export default function ChatScreen() {
  const { session, isLoading } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI fitness assistant. Ask me any questions about workouts, nutrition, or fitness in general. I can also update your fitness data if you ask me to.',
      isUser: false,
      timestamp: new Date(),
      role: 'assistant'
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardDidShowListener = Keyboard.addListener(
        'keyboardDidShow',
        () => {
          setKeyboardVisible(true);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
          setKeyboardVisible(false);
        }
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

  const processResponseForSuggestions = (text: string): [string, Suggestion[]] => {
    const suggestions: Suggestion[] = [];
    let processedText = text;

    if (processedText.includes('DATA_UPDATE_NUTRITION:')) {
      const dataStart = processedText.indexOf('DATA_UPDATE_NUTRITION:');
      const dataEnd = processedText.indexOf('END_DATA_UPDATE', dataStart);

      if (dataStart >= 0 && dataEnd >= 0) {
        try {
          const jsonString = processedText.substring(dataStart + 22, dataEnd).trim();
          const nutritionData = JSON.parse(jsonString);

          suggestions.push({
            id: Date.now().toString(),
            type: 'nutrition',
            title: 'Update Nutrition Settings',
            data: nutritionData
          });

          processedText = processedText.replace(/DATA_UPDATE_NUTRITION:[\s\S]*?END_DATA_UPDATE/, '');
        } catch (error) {
          console.error('Error parsing nutrition data:', error);
        }
      }
    }

    if (processedText.includes('DATA_ADD_WORKOUT:')) {
      const dataStart = processedText.indexOf('DATA_ADD_WORKOUT:');
      const dataEnd = processedText.indexOf('END_DATA_ADD', dataStart);

      if (dataStart >= 0 && dataEnd >= 0) {
        try {
          const jsonString = processedText.substring(dataStart + 17, dataEnd).trim();
          const workoutData = JSON.parse(jsonString);

          suggestions.push({
            id: (Date.now() + 1).toString(),
            type: 'workout',
            title: `Add Workout: ${workoutData.title}`,
            data: workoutData
          });

          processedText = processedText.replace(/DATA_ADD_WORKOUT:[\s\S]*?END_DATA_ADD/, '');
        } catch (error) {
          console.error('Error parsing workout data:', error);
        }
      }
    }

    return [processedText, suggestions];
  };

  const handleAcceptSuggestion = async (messageId: string, suggestion: Suggestion) => {
    if (!session?.user?.id) {
      Alert.alert('Not logged in', 'Please log in to use this feature');
      return;
    }

    try {
      console.log(`Accepting suggestion: ${suggestion.type} - ${suggestion.title}`);

      if (suggestion.type === 'nutrition') {
        console.log('Updating nutrition with data:', suggestion.data);
        await updateNutritionData(session.user.id, suggestion.data);

        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                suggestions: msg.suggestions?.map(s =>
                  s.id === suggestion.id ? { ...s, accepted: true } : s
                )
              };
            }
            return msg;
          })
        );

        const confirmMessage: Message = {
          id: Date.now().toString(),
          text: '✅ Your nutrition settings have been successfully updated!',
          isUser: false,
          timestamp: new Date(),
          role: 'assistant'
        };

        setMessages(prev => [...prev, confirmMessage]);
      } else if (suggestion.type === 'workout') {
        console.log('Adding workout with data:', suggestion.data);
        await addWorkoutEntry(session.user.id, suggestion.data);

        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                suggestions: msg.suggestions?.map(s =>
                  s.id === suggestion.id ? { ...s, accepted: true } : s
                )
              };
            }
            return msg;
          })
        );

        const confirmMessage: Message = {
          id: Date.now().toString(),
          text: `✅ Your workout "${suggestion.data.title}" has been successfully added!`,
          isUser: false,
          timestamp: new Date(),
          role: 'assistant'
        };

        setMessages(prev => [...prev, confirmMessage]);
      }
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      Alert.alert('Error', `Failed to process your request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;

    if (!session?.user?.id) {
      Alert.alert('Not logged in', 'Please log in to use the AI assistant');
      return;
    }

    setIsProcessing(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      role: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    try {
      const formattedMessages = messages
        .filter(msg => msg.role)
        .concat(userMessage)
        .map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.text
        }));

      const response = await sendMessageToDeepseek(formattedMessages, session.user.id);

      const [processedText, suggestions] = processResponseForSuggestions(response);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: processedText,
        isUser: false,
        timestamp: new Date(),
        role: 'assistant',
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message to Deepseek:', error);

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again later.',
        isUser: false,
        timestamp: new Date(),
        role: 'assistant'
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsProcessing(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((message) => (
            <View key={message.id}>
              <View
                style={[
                  styles.messageContainer,
                  message.isUser ? styles.userMessage : styles.aiMessage,
                ]}>
                {message.isUser ? (
                  <Text style={[
                    styles.messageText,
                    styles.userMessageText,
                  ]}>
                    {message.text}
                  </Text>
                ) : (
                  <Markdown
                    style={markdownStyles}>
                    {message.text}
                  </Markdown>
                )}
                <Text style={[
                  styles.timestamp,
                  message.isUser ? styles.userTimestamp : styles.aiTimestamp,
                ]}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
           
              {message.suggestions && message.suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {message.suggestions.map((suggestion) => (
                    <View key={suggestion.id} style={styles.suggestionCard}>
                      <View style={styles.suggestionHeader}>
                        <Text style={styles.suggestionType}>
                          {suggestion.type === 'nutrition' ? '🍎 Nutrition' : '💪 Workout'}
                        </Text>
                        <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                      </View>
                      
                      {suggestion.accepted ? (
                        <View style={styles.acceptedContainer}>
                          <CheckCircle size={18} color="#34C759" />
                          <Text style={styles.acceptedText}>Applied</Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.acceptButton}
                          onPress={() => handleAcceptSuggestion(message.id, suggestion)}
                        >
                          <ThumbsUp size={18} color="#FFFFFF" />
                          <Text style={styles.acceptButtonText}>Apply Changes</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          
          {isProcessing && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>
        <View style={[
          styles.inputContainer,
          Platform.OS === 'android' && { paddingBottom: keyboardVisible ? 10 : 15 }
        ]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about fitness..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={500}
            editable={!isProcessing}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isProcessing) && styles.sendButtonDisabled
            ]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isProcessing}
            activeOpacity={0.7}>
            <Send size={24} color={inputText.trim() && !isProcessing ? '#FFFFFF' : '#A0A0A0'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: {
    color: '#000000',
    fontSize: 16,
    lineHeight: 22,
  },
  heading1: {
    fontSize: 24,
    marginTop: 10,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#000000',
  },
  heading2: {
    fontSize: 20,
    marginTop: 8,
    marginBottom: 6,
    fontWeight: 'bold',
    color: '#000000',
  },
  heading3: {
    fontSize: 18,
    marginTop: 6,
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#000000',
  },
  link: {
    color: '#0077CC',
    textDecorationLine: 'underline',
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#CCCCCC',
    paddingLeft: 8,
    fontStyle: 'italic',
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 4,
  },
  bullet_list: {
    marginBottom: 10,
  },
  ordered_list: {
    marginBottom: 10,
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    fontFamily: 'monospace',
    backgroundColor: '#F1F1F1',
    padding: 2,
    borderRadius: 3,
  },
  code_block: {
    backgroundColor: '#F1F1F1',
    padding: 10,
    borderRadius: 5,
    fontFamily: 'monospace',
    marginVertical: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginVertical: 10,
  },
  thead: {
    backgroundColor: '#F1F1F1',
    fontWeight: 'bold',
  },
  tr: {
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  th: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#CCCCCC',
  },
  td: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#CCCCCC',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 8,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginVertical: 8,
  },
  typingText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  suggestionHeader: {
    marginBottom: 10,
  },
  suggestionType: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  acceptedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  acceptedText: {
    marginLeft: 6,
    color: '#34C759',
    fontWeight: '600',
  },
});