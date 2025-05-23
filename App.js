import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  FlatList,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import axios from 'axios';
import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Animated } from 'react-native';

const STORAGE_KEY = 'TODO_LIST';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState('');
  const [newDate, setNewDate] = useState('');
  const [priority, setPriority] = useState('low');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentEdit, setCurrentEdit] = useState(null);
  const [progress, setProgress] = useState(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const fetchTodos = async () => {
    try {
      const response = await axios.get('https://dummyjson.com/todos');
      const todosWithExtras = response.data.todos.map(todo => ({
        ...todo,
        id: uuid.v4(),
        date: new Date().toISOString().split('T')[0],
        priority: 'low',
        color: getRandomColor(),
      }));
      setTodos(todosWithExtras);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const getRandomColor = () => {
    const colors = ['#FFCDD2', '#C5E1A5', '#BBDEFB', '#FFE082', '#D1C4E9'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const saveTodosToStorage = async (todoList) => {
    try {
      const jsonValue = JSON.stringify(todoList);
      await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
    } catch (e) {
      console.error('❌ Помилка збереження в AsyncStorage:', e);
    }
  };

  const loadTodosFromStorage = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error('❌ Помилка завантаження з AsyncStorage:', e);
      return null;
    }
  };

  const scheduleNotification = async (todo) => {
    if (Device.isDevice) {
      const trigger = new Date(todo.date);
      trigger.setHours(9);
      trigger.setMinutes(0);
      trigger.setSeconds(0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Нагадування",
          body: `Завдання: ${todo.todo}`,
          data: { id: todo.id },
        },
        trigger,
      });
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const stored = await loadTodosFromStorage();
      if (stored) {
        setTodos(stored);
      } else {
        await fetchTodos();
      }
      setLoading(false);
    };
    initialize();
  }, []);

  useEffect(() => {
    if (!loading) {
      saveTodosToStorage(todos);
    }
  }, [todos]);

  const addTodo = () => {
    if (newTodo.trim() === '' || newDate.trim() === '') return;
    const newItem = {
      id: uuid.v4(),
      todo: newTodo,
      completed: false,
      color: getRandomColor(),
      date: newDate,
      priority,
    };
    setTodos([newItem, ...todos]);
    scheduleNotification(newItem);
    setNewTodo('');
    setNewDate('');
    setPriority('low');
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const startEditing = (item) => {
    setCurrentEdit(item);
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    if (!currentEdit.todo.trim() || !currentEdit.date.trim()) return;
    setTodos(prev =>
      prev.map(t => (t.id === currentEdit.id ? { ...currentEdit } : t))
    );
    scheduleNotification(currentEdit);
    setEditModalVisible(false);
    setCurrentEdit(null);
  };

  const toggleComplete = (id) => {
    setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
  };

  const getIncompleteCount = () => {
    return todos.filter(todo => !todo.completed).length;
  };

  const progressColor = animatedProgress.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#F44336', '#FF9800', '#FFC107', '#8BC34A', '#4CAF50']
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onLongPress={() => startEditing(item)}
      onPress={() => toggleComplete(item.id)}
      style={[styles.todoItem, { backgroundColor: item.color }]}
    >
      <View style={styles.todoRow}>
        <View style={{ flex: 1 }}>
          <Text style={item.completed ? styles.completed : styles.title}>• {item.todo}</Text>
          <Text style={styles.dateText}>📅 {item.date}</Text>
          <Text style={styles.priorityText}>🔥 Пріоритет: {item.priority.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={() => deleteTodo(item.id)}>
          <Text style={styles.deleteBtn}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>🎨 Список завдань</Text>

      <View style={styles.inputContainer}>
        <TextInput
          value={newTodo}
          onChangeText={setNewTodo}
          placeholder="Нове завдання..."
          style={styles.input}
        />
        <TextInput
          value={newDate}
          onChangeText={setNewDate}
          placeholder="Дата (YYYY-MM-DD)"
          style={styles.input}
        />
      </View>

      <View style={styles.priorityContainer}>
        {['low', 'medium', 'high'].map(level => (
          <TouchableOpacity
            key={level}
            onPress={() => setPriority(level)}
            style={[styles.priorityButton, priority === level && styles.prioritySelected, level === 'low' && styles.low, level === 'medium' && styles.medium, level === 'high' && styles.high]}
          >
            <Text style={styles.priorityTextBtn}>{level.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={addTodo} style={styles.addButton}>
          <Text style={styles.addButtonText}>➕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.incompleteContainer}>
        <Text style={styles.incompleteCount}>
          Невиконано: {getIncompleteCount()}
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: animatedProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: progressColor }]} />
      </View>
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setProgress(prev => (prev >= 1 ? 0 : prev + 0.25))}>
        <Text style={styles.addButtonText}>➡️ NEXT</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={todos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Редагувати завдання</Text>
            <TextInput
              value={currentEdit?.todo}
              onChangeText={(text) => setCurrentEdit({ ...currentEdit, todo: text })}
              style={styles.input}
              placeholder="Текст завдання"
            />
            <TextInput
              value={currentEdit?.date}
              onChangeText={(text) => setCurrentEdit({ ...currentEdit, date: text })}
              style={styles.input}
              placeholder="Дата (YYYY-MM-DD)"
            />
            <View style={styles.priorityContainer}>
              {['low', 'medium', 'high'].map(level => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setCurrentEdit({ ...currentEdit, priority: level })}
                  style={[styles.priorityButton, currentEdit?.priority === level && styles.prioritySelected, level === 'low' && styles.low, level === 'medium' && styles.medium, level === 'high' && styles.high]}
                >
                  <Text style={styles.priorityTextBtn}>{level.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>💾 Зберегти</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>❌ Скасувати</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 50, backgroundColor: '#FAFAFA' },
  heading: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  todoItem: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  todoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: { fontSize: 16, fontWeight: '600' },
  completed: { fontSize: 16, textDecorationLine: 'line-through', color: '#888' },
  deleteBtn: { fontSize: 20, color: '#E53935' },
  dateText: { fontSize: 14, color: '#666' },
  priorityText: { fontSize: 14, color: '#333', fontWeight: 'bold' },
  inputContainer: {
    flexDirection: 'column',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
    fontSize: 16,
    borderColor: '#DDD',
    borderWidth: 1,
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  priorityButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    marginBottom: 5,
  },
  priorityTextBtn: {
    color: '#fff',
    fontWeight: 'bold',
  },
  prioritySelected: {
    borderWidth: 2,
    borderColor: '#000',
  },
  low: { backgroundColor: '#8BC34A' },
  medium: { backgroundColor: '#FFC107' },
  high: { backgroundColor: '#F44336' },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 10,
    marginLeft: 5,
  },
  addButtonText: {
    fontSize: 20,
    color: '#FFF',
  },
  progressBarContainer: {
    height: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#EEE',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
  },
  nextButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    alignItems: 'center',
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000099',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  saveBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
  },
  cancelBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#FFF',
    fontSize: 16,
  },
  incompleteContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  incompleteCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});
