// ...existing code...

// Update the layout to center set numbers in blue circles
return (
  <View style={styles.setContainer}>
    <View style={styles.setNumberCircle}>
      <Text style={styles.setNumber}>{setNumber}</Text>
    </View>
    <View style={styles.setInfo}>
      <Text style={styles.weightReps}>{weight} kg × {reps} reps</Text>
    </View>
  </View>
);

// ...existing code...

const styles = StyleSheet.create({
  // ...existing code...
  setContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  setNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setNumber: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  setInfo: {
    flex: 1,
  },
  weightReps: {
    fontSize: 16,
  },
  // ...existing code...
});
