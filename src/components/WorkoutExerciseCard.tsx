// ...existing code...

// Update the set number display to be centered in blue circles
return (
  // ...existing code...
  <View style={styles.setsContainer}>
    {sets.map((set, index) => (
      <View key={index} style={styles.setRow}>
        <View style={styles.setNumberContainer}>
          <Text style={styles.setNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.setDetails}>
          <Text style={styles.setText}>{set.weight} kg × {set.reps} reps</Text>
        </View>
      </View>
    ))}
  </View>
  // ...existing code...
);

// ...existing code...

const styles = StyleSheet.create({
  // ...existing code...
  setsContainer: {
    marginTop: 10,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  setNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  setDetails: {
    flex: 1,
  },
  setText: {
    fontSize: 16,
  },
  // ...existing code...
});
