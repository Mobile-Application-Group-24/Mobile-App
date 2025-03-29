import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Droplets, Coffee, UtensilsCrossed, Pizza, Moon, Scale, Calculator, ChevronRight, X, Plus, Minus, Settings } from 'lucide-react-native';

interface Meal {
  id: string;
  name: string;
  icon: any;
  calories: number;
  time: string;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 32;
const CHART_WIDTH = SCREEN_WIDTH - (CHART_PADDING * 2);

export default function NutritionScreen() {
  const [waterIntake, setWaterIntake] = useState(0);
  const [calories, setCalories] = useState({
    breakfast: 450,
    lunch: 650,
    dinner: 550,
    snacks: 200,
  });
  const [calorieGoal, setCalorieGoal] = useState(2200);

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showBMRModal, setShowBMRModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [bmrInputs, setBmrInputs] = useState({
    weight: '',
    height: '',
    age: '',
    gender: 'male',
  });

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [1850, 2100, 1950, 2200, 1800, 2300, calories.breakfast + calories.lunch + calories.dinner + calories.snacks],
    }],
  };

  const meals: Meal[] = [
    { id: 'breakfast', name: 'Breakfast', icon: Coffee, calories: calories.breakfast, time: '8:00 AM' },
    { id: 'lunch', name: 'Lunch', icon: UtensilsCrossed, calories: calories.lunch, time: '1:00 PM' },
    { id: 'dinner', name: 'Dinner', icon: Pizza, calories: calories.dinner, time: '7:00 PM' },
    { id: 'snacks', name: 'Snacks', icon: Moon, calories: calories.snacks, time: 'All day' },
  ];

  const totalCalories = Object.values(calories).reduce((sum, cal) => sum + cal, 0);
  const remainingCalories = calorieGoal - totalCalories;

  const calculateBMR = () => {
    const { weight, height, age, gender } = bmrInputs;
    if (weight && height && age) {
      const w = parseFloat(weight);
      const h = parseFloat(height);
      const a = parseFloat(age);
      let bmr = 0;

      if (gender === 'male') {
        bmr = 88.362 + (13.397 * w) + (4.799 * h) - (5.677 * a);
      } else {
        bmr = 447.593 + (9.247 * w) + (3.098 * h) - (4.330 * a);
      }

      setCalorieGoal(Math.round(bmr * 1.2)); // Setting goal to BMR * 1.2 (sedentary lifestyle)
      setShowBMRModal(false);
    }
  };

  const handleMealPress = (meal: Meal) => {
    setSelectedMeal(meal);
    setEditModalVisible(true);
  };

  const updateMealCalories = (amount: number) => {
    if (!selectedMeal) return;
    
    const newCalories = Math.max(0, calories[selectedMeal.id as keyof typeof calories] + amount);
    setCalories(prev => ({
      ...prev,
      [selectedMeal.id]: newCalories
    }));
  };

  const renderWaterDrops = () => {
    return (
      <View style={styles.waterDropsContainer}>
        {[...Array(8)].map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.waterDrop,
              index < waterIntake && styles.waterDropFilled
            ]}
            onPress={() => setWaterIntake(index + 1)}
          >
            <Droplets
              size={24}
              color={index < waterIntake ? '#FFFFFF' : '#007AFF'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.safeArea} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Nutrition Tracking</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.goalButton}
          onPress={() => setShowGoalModal(true)}
        >
          <Settings size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.calorieCard}>
        <View style={styles.calorieHeader}>
          <Text style={styles.calorieTitle}>Daily Calories</Text>
          <View style={styles.calorieProgress}>
            <View 
              style={[
                styles.calorieProgressBar, 
                { width: `${Math.min((totalCalories / calorieGoal) * 100, 100)}%` }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.calorieStats}>
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatLabel}>Consumed</Text>
            <Text style={styles.calorieStatValue}>{totalCalories}</Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatLabel}>Remaining</Text>
            <Text style={[
              styles.calorieStatValue,
              { color: remainingCalories >= 0 ? '#34C759' : '#FF3B30' }
            ]}>
              {remainingCalories}
            </Text>
          </View>
          <View style={styles.calorieDivider} />
          <View style={styles.calorieStat}>
            <Text style={styles.calorieStatLabel}>Goal</Text>
            <Text style={styles.calorieStatValue}>{calorieGoal}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Overview</Text>
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={CHART_WIDTH}
            height={180}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#FFFFFF',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        {meals.map((meal) => (
          <TouchableOpacity 
            key={meal.id} 
            style={styles.mealCard}
            onPress={() => handleMealPress(meal)}
          >
            <View style={styles.mealIcon}>
              <meal.icon size={24} color="#007AFF" />
            </View>
            <View style={styles.mealInfo}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealTime}>{meal.time}</Text>
            </View>
            <View style={styles.mealCalories}>
              <Text style={styles.mealCaloriesValue}>{meal.calories}</Text>
              <Text style={styles.mealCaloriesLabel}>cal</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.section, styles.waterSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Water Intake</Text>
          <Text style={styles.waterTarget}>{waterIntake}/8 glasses</Text>
        </View>
        {renderWaterDrops()}
        <Text style={styles.waterHint}>Tap drops to update your water intake</Text>
      </View>

      <TouchableOpacity 
        style={styles.bmrCard}
        onPress={() => setShowBMRModal(true)}
      >
        <View style={styles.bmrContent}>
          <View style={styles.bmrIcon}>
            <Calculator size={24} color="#FFFFFF" />
          </View>
          <View style={styles.bmrInfo}>
            <Text style={styles.bmrTitle}>Calculate BMR</Text>
            <Text style={styles.bmrDescription}>
              Find out your Basal Metabolic Rate and daily calorie needs
            </Text>
          </View>
        </View>
        <ChevronRight size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Meal Calories Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedMeal?.name} Calories
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.calorieEditor}>
              <TouchableOpacity 
                style={styles.calorieButton}
                onPress={() => updateMealCalories(-50)}
              >
                <Minus size={24} color="#007AFF" />
              </TouchableOpacity>
              
              <Text style={styles.calorieValue}>
                {selectedMeal ? calories[selectedMeal.id as keyof typeof calories] : 0}
              </Text>
              
              <TouchableOpacity 
                style={styles.calorieButton}
                onPress={() => updateMealCalories(50)}
              >
                <Plus size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.calorieHint}>
              Tap + or - to adjust by 50 calories
            </Text>
          </View>
        </View>
      </Modal>

      {/* BMR Calculator Modal */}
      <Modal
        visible={showBMRModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBMRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculate BMR</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowBMRModal(false)}
              >
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.bmrForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={bmrInputs.weight}
                  onChangeText={(text) => setBmrInputs(prev => ({ ...prev, weight: text }))}
                  keyboardType="numeric"
                  placeholder="70"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={bmrInputs.height}
                  onChangeText={(text) => setBmrInputs(prev => ({ ...prev, height: text }))}
                  keyboardType="numeric"
                  placeholder="170"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={styles.input}
                  value={bmrInputs.age}
                  onChangeText={(text) => setBmrInputs(prev => ({ ...prev, age: text }))}
                  keyboardType="numeric"
                  placeholder="25"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      bmrInputs.gender === 'male' && styles.genderButtonActive
                    ]}
                    onPress={() => setBmrInputs(prev => ({ ...prev, gender: 'male' }))}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      bmrInputs.gender === 'male' && styles.genderButtonTextActive
                    ]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      bmrInputs.gender === 'female' && styles.genderButtonActive
                    ]}
                    onPress={() => setBmrInputs(prev => ({ ...prev, gender: 'female' }))}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      bmrInputs.gender === 'female' && styles.genderButtonTextActive
                    ]}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.calculateButton}
                onPress={calculateBMR}
              >
                <Text style={styles.calculateButtonText}>Calculate & Set Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calorie Goal Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Calorie Goal</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowGoalModal(false)}
              >
                <X size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.goalEditor}>
              <TextInput
                style={styles.goalInput}
                value={String(calorieGoal)}
                onChangeText={(text) => setCalorieGoal(parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="Enter daily calorie goal"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.saveButtonText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  safeArea: {
    height: 44,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 16,
    color: '#8E8E93',
  },
  goalButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calorieHeader: {
    marginBottom: 16,
  },
  calorieTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  calorieProgress: {
    height: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 4,
    overflow: 'hidden',
  },
  calorieProgressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  calorieStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieStat: {
    flex: 1,
    alignItems: 'center',
  },
  calorieStatLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  calorieStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  calorieDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  mealIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  mealCalories: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  mealCaloriesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  mealCaloriesLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  waterSection: {
    padding: 20,
  },
  waterTarget: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  waterDropsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  waterDrop: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  waterDropFilled: {
    backgroundColor: '#007AFF',
  },
  waterHint: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 16,
  },
  bmrCard: {
    backgroundColor: '#007AFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bmrContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bmrIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bmrInfo: {
    flex: 1,
  },
  bmrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bmrDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  bmrForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#007AFF',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  genderButtonTextActive: {
    color: '#FFFFFF',
  },
  calculateButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  goalEditor: {
    gap: 16,
  },
  goalInput: {
    backgroundColor: '#F2F2F7',
    padding: 16,
    borderRadius: 12,
    fontSize: 24,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calorieEditor: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieButton: {
    width: 56,
    height: 56,
    backgroundColor: '#F2F2F7',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calorieValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  calorieHint: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 14,
  },
});