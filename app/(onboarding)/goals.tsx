import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Scale, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';

type FitnessGoal = 'lose' | 'gain' | 'maintain';

export default function GoalsScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  
  useEffect(() => {
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
  }, []);

  const handleGoalSelect = (goal: FitnessGoal) => {
    setSelectedGoal(goal);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleContinue = async () => {
    if (!selectedGoal || !targetWeight) return;

    try {
      setLoading(true);
      console.log("Saving goals and navigating directly to schedule...");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          fitness_goal: selectedGoal,
          target_weight: parseFloat(targetWeight),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log("Successfully saved goals, navigating to schedule screen");
      
      console.log("Navigation path: /(onboarding)/schedule");
      
      
      setTimeout(() => {
        router.push({
          pathname: "/(onboarding)/schedule"
        });
      }, 100);
    } catch (error) {
      console.error('Error saving goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const goals = [
    {
      id: 'lose' as const,
      icon: TrendingDown,
      label: 'Lose Weight',
      description: 'Burn fat and get lean',
      color: '#FF3B30',
      details: 'Perfect for those looking to reduce body fat, improve definition, and achieve a leaner physique.',
    },
    {
      id: 'maintain' as const,
      icon: Scale,
      label: 'Maintain Weight',
      description: 'Stay fit and healthy',
      color: '#007AFF',
      details: 'Ideal for those who want to maintain their current weight while improving strength and fitness.',
    },
    {
      id: 'gain' as const,
      icon: TrendingUp,
      label: 'Gain Weight',
      description: 'Build muscle and strength',
      color: '#34C759',
      details: 'Designed for those looking to build muscle mass and increase overall strength.',
    },
  ];

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 30 : 0}
    >
      <View style={styles.container}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.content}>
            <Text style={styles.title}>What's Your Goal?</Text>
            <Text style={styles.subtitle}>Select your primary fitness goal</Text>

            <View style={styles.goalsContainer}>
              {goals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    selectedGoal === goal.id && styles.goalCardSelected
                  ]}
                  onPress={() => handleGoalSelect(goal.id)}
                >
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: selectedGoal === goal.id ? goal.color : `${goal.color}15` }
                  ]}>
                    <goal.icon
                      size={32}
                      color={selectedGoal === goal.id ? '#FFFFFF' : goal.color}
                    />
                  </View>
                  <View style={styles.goalContent}>
                    <View style={styles.goalHeader}>
                      <Text style={[
                        styles.goalLabel,
                        selectedGoal === goal.id && { color: goal.color }
                      ]}>
                        {goal.label}
                      </Text>
                      <Text style={styles.goalDescription}>
                        {goal.description}
                      </Text>
                    </View>
                    <Text style={styles.goalDetails}>
                      {goal.details}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.weightSection}>
              <Text style={styles.weightTitle}>Target Weight</Text>
              <Text style={styles.weightSubtitle}>What weight do you want to achieve?</Text>
              <View style={styles.weightInputContainer}>
                <TextInput
                  style={styles.weightInput}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  placeholder="Enter target weight"
                  keyboardType="numeric"
                  placeholderTextColor="#8E8E93"
                />
                <Text style={styles.weightUnit}>kg</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[
          styles.footer,
          keyboardVisible && Platform.OS === 'ios' && styles.footerWithKeyboard
        ]}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedGoal || !targetWeight || loading) && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!selectedGoal || !targetWeight || loading}
          >
            <Text style={styles.continueButtonText}>
              {loading ? 'Saving...' : 'Continue'}
            </Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 17,
    color: '#666666',
    marginBottom: 32,
    lineHeight: 22,
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  goalCardSelected: {
    backgroundColor: '#F8F8F8',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalContent: {
    flex: 1,
    gap: 8,
  },
  goalHeader: {
    gap: 4,
  },
  goalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  goalDescription: {
    fontSize: 15,
    color: '#666666',
  },
  goalDetails: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8E8E93',
  },
  weightSection: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  weightTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  weightSubtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 16,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 16,
    padding: 16,
  },
  weightInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  weightUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 1,
  },
  footerWithKeyboard: {
    position: 'relative',
    marginTop: 12,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#A2A2A2',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});