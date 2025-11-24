import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

export function AlertModal({
  visible,
  title,
  message,
  onClose,
  type = 'info',
}: AlertModalProps) {
  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          emoji: '🎉',
          iconBg: '#10B981',
          buttonBg: '#10B981',
        };
      case 'error':
        return {
          bg: '#FEF2F2',
          border: '#FECACA',
          emoji: '⚠️',
          iconBg: '#EF4444',
          buttonBg: '#EF4444',
        };
      default:
        return {
          bg: '#EFF6FF',
          border: '#BFDBFE',
          emoji: '💡',
          iconBg: '#6366F1',
          buttonBg: '#6366F1',
        };
    }
  };

  const colors = getColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1} style={[styles.modal, { borderColor: colors.border }]}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.iconBg },
              ]}
            >
              <Text style={styles.emoji}>{colors.emoji}</Text>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.buttonBg }]} 
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Got it!</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    borderWidth: 3,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 20,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});
