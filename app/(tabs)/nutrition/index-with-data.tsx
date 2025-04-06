import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Dimensions, Modal, Alert, ActivityIndicator, StatusBar, SafeAreaView, Platform, KeyboardAvoidingView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Droplets, Coffee, UtensilsCrossed, Pizza, Moon, Scale, Calculator, ChevronRight, X, Plus, Minus, Settings } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import { 
    getNutritionSettings, 
    updateNutritionSettings, 
    getTodaysMeals, 
    getWeeklyMeals, 
    addMeal, 
    updateMeal as updateMealInDb,
    Meal as MealType,
    NutritionSettings 
} from '../../../utils/supabase';

interface Meal {
    id: string;
    name: string;
    icon: any;
    calories: number;
    time: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'water';
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 32;
const CHART_WIDTH = SCREEN_WIDTH - (CHART_PADDING * 2);

export default function NutritionScreen() {
    const navigation = useNavigation();
    const [waterIntake, setWaterIntake] = useState(0);
    const [waterGoal, setWaterGoal] = useState(8);
    const [calories, setCalories] = useState({
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snacks: 0,
    });
    const [calorieGoal, setCalorieGoal] = useState(2200);
    const [mealTimes, setMealTimes] = useState({
        breakfast: '8:00 AM',
        lunch: '1:00 PM',
        dinner: '7:00 PM',
        snacks: 'All day'
    });

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

    const [loading, setLoading] = useState(true);
    const [weeklyData, setWeeklyData] = useState<{date: string; calories: number}[]>([]);
    const [meals, setMeals] = useState<Meal[]>([]);
    const [dbMeals, setDbMeals] = useState<MealType[]>([]);
    const [temporaryCalories, setTemporaryCalories] = useState(0);
    const [waterMealId, setWaterMealId] = useState<string | null>(null);

    const formatChartData = (weekData: {date: string; calories: number}[]) => {
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - i));
            return {
                date: date,
                dayName: format(date, 'EEE'),
                formattedDate: format(date, 'yyyy-MM-dd'),
                calories: 0
            };
        });

        weekData.forEach(item => {
            try {
                const itemDate = new Date(item.date);
                if (!isNaN(itemDate.getTime())) {
                    const formattedItemDate = format(itemDate, 'yyyy-MM-dd');
                    const dayIndex = last7Days.findIndex(day => 
                        day.formattedDate === formattedItemDate
                    );
                    if (dayIndex !== -1) {
                        last7Days[dayIndex].calories += typeof item.calories === 'number' 
                            ? item.calories 
                            : parseInt(String(item.calories)) || 0;
                    }
                }
            } catch (error) {
                console.error('Error processing chart data item:', error);
            }
        });

        return {
            labels: last7Days.map(day => day.dayName),
            datasets: [{
                data: last7Days.map(day => day.calories),
            }],
        };
    };

    const refreshNutritionData = useCallback(async () => {
        try {
            setLoading(true);
            
            const todaysMeals = await getTodaysMeals();
            setDbMeals(todaysMeals);
            
            const mealCalories = {
                breakfast: 0,
                lunch: 0,
                dinner: 0,
                snacks: 0
            };
            
            let todaysWaterIntake = 0;
            let waterMeal = null;
            
            todaysMeals.forEach(meal => {
                if (meal.name === 'Water Intake' && meal.meal_type === 'water') {
                    todaysWaterIntake = typeof meal.calories === 'number' ? meal.calories : parseInt(String(meal.calories)) || 0;
                    waterMeal = meal;
                } else if (mealCalories.hasOwnProperty(meal.meal_type)) {
                    const mealCalorieValue = typeof meal.calories === 'number' ? meal.calories : parseInt(String(meal.calories)) || 0;
                    if (meal.meal_type !== 'water') {
                        mealCalories[meal.meal_type as keyof typeof mealCalories] += mealCalorieValue;
                    }
                }
            });
            
            if (waterMeal) {
                setWaterMealId(waterMeal.id);
            } else {
                setWaterMealId(null);
            }
            
            setWaterIntake(todaysWaterIntake);
            setCalories(mealCalories);
            
            const weeklyMealData = await getWeeklyMeals();
            const processedWeeklyData = weeklyMealData.map(item => ({
                date: item.date,
                calories: typeof item.calories === 'number' ? item.calories : parseInt(String(item.calories)) || 0
            }));
            setWeeklyData(processedWeeklyData);
            
        } catch (error) {
            console.error('Failed to refresh nutrition data:', error);
            Alert.alert('Error', 'Failed to refresh nutrition data');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            const fetchNutritionData = async () => {
                try {
                    setLoading(true);
                    
                    const settings = await getNutritionSettings();
                    setCalorieGoal(settings.calorie_goal);
                    
                    if (settings.water_goal) {
                        setWaterGoal(settings.water_goal);
                    }
                    
                    if (settings.meal_times && Array.isArray(settings.meal_times)) {
                        const mealTimeSettings = {} as Record<string, string>;
                        
                        settings.meal_times.forEach(mealTime => {
                            if (mealTime.enabled && ['breakfast', 'lunch', 'dinner'].includes(mealTime.name.toLowerCase())) {
                                mealTimeSettings[mealTime.name.toLowerCase()] = mealTime.time;
                            }
                        });
                        
                        if (Object.keys(mealTimeSettings).length > 0) {
                            setMealTimes(prev => ({
                                ...prev,
                                ...mealTimeSettings
                            }));
                        }
                    }
                    
                    await refreshNutritionData();
                    
                } catch (error) {
                    console.error('Failed to load nutrition data:', error);
                    Alert.alert('Error', 'Failed to load nutrition data');
                } finally {
                    setLoading(false);
                }
            };
            
            fetchNutritionData();
        }, [refreshNutritionData])
    );

    useEffect(() => {
        const mealIcons = {
            breakfast: Coffee,
            lunch: UtensilsCrossed,
            dinner: Pizza,
            snacks: Moon
        };

        const mealGroups = {
            breakfast: {
                id: 'breakfast',
                name: 'Breakfast',
                icon: Coffee,
                calories: calories.breakfast,
                time: mealTimes.breakfast,
                mealType: 'breakfast' as const
            },
            lunch: {
                id: 'lunch',
                name: 'Lunch',
                icon: UtensilsCrossed,
                calories: calories.lunch,
                time: mealTimes.lunch,
                mealType: 'lunch' as const
            },
            dinner: {
                id: 'dinner',
                name: 'Dinner',
                icon: Pizza,
                calories: calories.dinner,
                time: mealTimes.dinner,
                mealType: 'dinner' as const
            },
            snacks: {
                id: 'snacks',
                name: 'Snacks',
                icon: Moon,
                calories: calories.snacks,
                time: mealTimes.snacks,
                mealType: 'snacks' as const
            }
        };
        
        setMeals(Object.values(mealGroups));
    }, [calories, dbMeals, mealTimes]);

    const chartData = formatChartData(weeklyData);

    const totalCalories = Object.values(calories).reduce((sum, cal) => sum + cal, 0);
    const remainingCalories = calorieGoal - totalCalories;

    const handleWaterIntakeChange = async (amount: number) => {
        try {
            setWaterIntake(amount);
            
            if (waterMealId) {
                await updateMealInDb(waterMealId, { 
                    calories: amount,
                    meal_type: 'water'
                });
            } else {
                const result = await addMeal({
                    name: 'Water Intake',
                    calories: amount,
                    meal_type: 'water',
                    consumed_at: new Date().toISOString()
                });
                if (result && result.id) {
                    setWaterMealId(result.id);
                }
            }
            
            const updatedMeals = await getTodaysMeals();
            const waterMeal = updatedMeals.find(meal => meal.name === 'Water Intake' && meal.meal_type === 'water');
            if (waterMeal) {
                setWaterMealId(waterMeal.id);
            }
            
        } catch (error) {
            console.error('Failed to update water intake:', error);
            Alert.alert('Error', 'Failed to update water intake');
            setWaterIntake(prevWaterIntake => prevWaterIntake);
        }
    };

    const calculateBMR = async () => {
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

            const newGoal = Math.round(bmr * 1.2);

            try {
                await updateNutritionSettings({ calorie_goal: newGoal });
                setShowBMRModal(false);
                setCalorieGoal(newGoal);
            } catch (error) {
                console.error('Failed to update calorie goal:', error);
                Alert.alert('Error', 'Failed to update calorie goal');
            }
        }
    };

    const handleMealPress = (meal: Meal) => {
        setSelectedMeal(meal);
        setTemporaryCalories(meal.mealType !== 'water' ? calories[meal.mealType] : 0);
        setEditModalVisible(true);
    };

    const updateMealCalories = (amount: number) => {
        const newCalories = Math.max(0, temporaryCalories + amount);
        setTemporaryCalories(newCalories);
    };

    const saveMealChanges = async () => {
        if (!selectedMeal) return;
        
        if (selectedMeal.mealType !== 'water' && temporaryCalories === calories[selectedMeal.mealType]) {
            setEditModalVisible(false);
            return;
        }

        try {
            const existingMeal = dbMeals.find(meal => 
                meal.meal_type === selectedMeal.mealType && 
                meal.meal_type !== 'water'
            );
            
            if (existingMeal) {
                await updateMealInDb(existingMeal.id, { 
                    calories: temporaryCalories
                });
            } else {
                await addMeal({
                    name: selectedMeal.name,
                    calories: temporaryCalories,
                    meal_type: selectedMeal.mealType,
                    consumed_at: new Date().toISOString()
                });
            }

            await refreshNutritionData();
            
            setEditModalVisible(false);
        } catch (error) {
            console.error('Failed to update meal calories:', error);
            Alert.alert('Error', 'Failed to update meal calories');
        }
    };

    const updateCalorieGoal = async () => {
        try {
            await updateNutritionSettings({ calorie_goal: calorieGoal });
            setShowGoalModal(false);
        } catch (error) {
            console.error('Failed to update calorie goal:', error);
            Alert.alert('Error', 'Failed to update calorie goal');
        }
    };

    const renderWaterDrops = () => {
        const waterDrops = [];
        for (let i = 1; i <= waterGoal; i++) {
            waterDrops.push(
                <TouchableOpacity
                    key={i}
                    style={[
                        styles.waterDrop,
                        i <= waterIntake && styles.waterDropFilled
                    ]}
                    onPress={() => handleWaterIntakeChange(i)}
                >
                    <Droplets
                        size={24}
                        color={i <= waterIntake ? '#FFFFFF' : '#007AFF'}
                    />
                </TouchableOpacity>
            );
        }
        return (
            <View style={styles.waterDropsContainer}>
                {waterDrops}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading nutrition data...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.fixedHeader}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>Nutrition Tracking</Text>
                        <Text style={styles.headerDate}>
                            {format(new Date(), 'EEEE, d MMMM yyyy')}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('settings' as never)}
                        activeOpacity={0.7}>
                        <Settings size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            </View>
            
            <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
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
                                    stroke: '#007AFF',
                                    fill: '#FFFFFF',
                                },
                                formatYLabel: (value) => Math.round(Number(value)).toString(),
                                propsForLabels: {
                                    fontSize: 12,
                                    fontWeight: '500',
                                }
                            }}
                            bezier
                            style={styles.chart}
                            fromZero={true}
                            renderDotContent={({x, y, index, indexData}) => (
                                <View key={index} style={{
                                    position: 'absolute',
                                    top: y - 25,
                                    left: x - 15,
                                }}>
                                    {indexData > 0 && (
                                        <Text style={{
                                            color: '#007AFF',
                                            fontSize: 10,
                                            fontWeight: 'bold',
                                        }}>{Math.round(Number(indexData))}</Text>
                                    )}
                                </View>
                            )}
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
                        <Text style={styles.waterTarget}>{waterIntake}/{waterGoal} glasses</Text>
                    </View>
                    {renderWaterDrops()}
                    <Text style={styles.waterHint}>Tap drops to update your water intake</Text>
                    <TouchableOpacity 
                        style={styles.waterResetButton}
                        onPress={() => handleWaterIntakeChange(0)}
                    >
                        <Text style={styles.waterResetButtonText}>Reset Water Intake</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.bmrCard}
                    onPress={() => setShowBMRModal(true)}
                    activeOpacity={0.7}>
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
            </ScrollView>

            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    Alert.alert(
                        "Save Changes",
                        "Do you want to save your changes?",
                        [
                            {
                                text: "Discard",
                                style: "cancel",
                                onPress: () => setEditModalVisible(false)
                            },
                            {
                                text: "Save",
                                onPress: saveMealChanges
                            }
                        ]
                    );
                }}
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
                                {temporaryCalories}
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
                        
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.saveButton, {flex: 1}]}
                                onPress={saveMealChanges}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={showBMRModal}
                onRequestClose={() => setShowBMRModal(false)}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Calculate BMR</Text>
                                <TouchableOpacity 
                                    style={styles.closeButton}
                                    onPress={() => setShowBMRModal(false)}>
                                    <X size={24} color="#8E8E93" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView>
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
                                        activeOpacity={0.7}>
                                        <Text style={styles.calculateButtonText}>Calculate</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal
                visible={showGoalModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowGoalModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
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
                                    onPress={updateCalorieGoal}
                                >
                                    <Text style={styles.saveButtonText}>Save Goal</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    safeArea: {
        height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    fixedHeader: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        zIndex: 1000,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    header: {
        padding: 16,
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
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 24,
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
        height: 40,
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
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderWidth: 2,
        borderColor: '#007AFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
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
    waterResetButton: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F2F2F7',
        borderRadius: 8,
        alignItems: 'center',
    },
    waterResetButtonText: {
        color: '#007AFF',
        fontWeight: '500',
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
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: Platform.OS === 'android' ? '90%' : '100%',
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
        paddingBottom: Platform.OS === 'android' ? 20 : 0,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
    },
    calorieButton: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 28,
        backgroundColor: '#F2F2F7',
        height: 56,
        width: 56,
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
    modalActions: {
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        marginTop: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#8E8E93',
    },
});