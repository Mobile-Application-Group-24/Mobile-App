import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Send } from 'lucide-react-native';
import { sendMessageToDeepseek, updateNutritionData, addWorkoutEntry } from '@/utils/deepseek';
import { useSession } from '@/utils/auth';
import Markdown from 'react-native-markdown-display';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  role?: 'user' | 'assistant' | 'system';
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
      // Format messages for the Deepseek API
      const formattedMessages = messages
        .filter(msg => msg.role) // Filter out messages without roles
        .concat(userMessage)
        .map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.text
        }));

      // Send message to Deepseek API
      const response = await sendMessageToDeepseek(formattedMessages, session.user.id);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
        role: 'assistant'
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

  // Parse AI response to check if it contains a data update command
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isUser) {
      // Check if message contains a data update command
      if (lastMessage.text.includes('DATA_UPDATE_NUTRITION:')) {
        try {
          const dataStart = lastMessage.text.indexOf('DATA_UPDATE_NUTRITION:');
          const dataEnd = lastMessage.text.indexOf('END_DATA_UPDATE', dataStart);
          
          if (dataStart >= 0 && dataEnd >= 0) {
            const jsonString = lastMessage.text.substring(dataStart + 22, dataEnd).trim();
            const nutritionData = JSON.parse(jsonString);
            
            // Format and clean up the visible message (remove the data section)
            const visibleText = lastMessage.text.replace(/DATA_UPDATE_NUTRITION:[\s\S]*?END_DATA_UPDATE/, '');
            
            // Update the last message to hide the data part
            setMessages(prev => prev.map((msg, idx) => 
              idx === prev.length - 1 ? {...msg, text: visibleText} : msg
            ));
            
            // Show confirmation to user
            Alert.alert(
              'Update Nutrition Data',
              'Would you like to update your nutrition settings with the data provided?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Update',
                  onPress: async () => {
                    try {
                      await updateNutritionData(session?.user?.id!, nutritionData);
                      
                      const confirmMessage: Message = {
                        id: Date.now().toString(),
                        text: '✅ Your nutrition data has been successfully updated!',
                        isUser: false,
                        timestamp: new Date(),
                        role: 'assistant'
                      };
                      
                      setMessages(prev => [...prev, confirmMessage]);
                    } catch (error) {
                      console.error('Error updating nutrition data:', error);
                      
                      const errorMessage: Message = {
                        id: Date.now().toString(),
                        text: '❌ Sorry, there was an error updating your nutrition data. Please try again later.',
                        isUser: false,
                        timestamp: new Date(),
                        role: 'assistant'
                      };
                      
                      setMessages(prev => [...prev, errorMessage]);
                    }
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Error parsing nutrition data update:', error);
        }
      } else if (lastMessage.text.includes('DATA_ADD_WORKOUT:')) {
        try {
          const dataStart = lastMessage.text.indexOf('DATA_ADD_WORKOUT:');
          const dataEnd = lastMessage.text.indexOf('END_DATA_ADD', dataStart);
          
          if (dataStart >= 0 && dataEnd >= 0) {
            const jsonString = lastMessage.text.substring(dataStart + 17, dataEnd).trim();
            const workoutData = JSON.parse(jsonString);
            
            // Format and clean up the visible message (remove the data section)
            const visibleText = lastMessage.text.replace(/DATA_ADD_WORKOUT:[\s\S]*?END_DATA_ADD/, '');
            
            // Update the last message to hide the data part
            setMessages(prev => prev.map((msg, idx) => 
              idx === prev.length - 1 ? {...msg, text: visibleText} : msg
            ));
            
            // Show confirmation to user
            Alert.alert(
              'Add Workout Entry',
              `Would you like to add "${workoutData.title}" to your workout records?`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Add Workout',
                  onPress: async () => {
                    try {
                      await addWorkoutEntry(session?.user?.id!, workoutData);
                      
                      const confirmMessage: Message = {
                        id: Date.now().toString(),
                        text: `✅ Your workout "${workoutData.title}" has been successfully added!`,
                        isUser: false,
                        timestamp: new Date(),
                        role: 'assistant'
                      };
                      
                      setMessages(prev => [...prev, confirmMessage]);
                    } catch (error) {
                      console.error('Error adding workout data:', error);
                      
                      const errorMessage: Message = {
                        id: Date.now().toString(),
                        text: '❌ Sorry, there was an error adding your workout. Please try again later.',
                        isUser: false,
                        timestamp: new Date(),
                        role: 'assistant'
                      };
                      
                      setMessages(prev => [...prev, errorMessage]);
                    }
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error('Error parsing workout data addition:', error);
        }
      }
    }
  }, [messages, session?.user?.id]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageContainer,
              message.isUser ? styles.userMessage : styles.aiMessage,
            ]}
          >
            {message.isUser ? (
              <Text style={[
                styles.messageText,
                styles.userMessageText,
              ]}>
                {message.text}
              </Text>
            ) : (
              <Markdown
                style={markdownStyles}
              >
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
        ))}
        {isProcessing && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask me anything about fitness..."
          multiline
          maxLength={500}
          editable={!isProcessing}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            (!inputText.trim() || isProcessing) && styles.sendButtonDisabled
          ]} 
          onPress={handleSend}
          disabled={!inputText.trim() || isProcessing}
        >
          <Send size={24} color={inputText.trim() && !isProcessing ? '#FFFFFF' : '#A0A0A0'} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
});