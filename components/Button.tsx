import React from 'react';
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  GestureResponderEvent,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const handlePress = (event: GestureResponderEvent) => {
    console.log('Button pressed:', title);
    if (disabled || loading) return;
    onPress?.(event);
  };

  const getButtonStyle = () => {
    const baseStyle: ViewStyle[] = [styles.button];
    
    if (size === 'sm') baseStyle.push(styles.buttonSm);
    if (size === 'md') baseStyle.push(styles.buttonMd);
    if (size === 'lg') baseStyle.push(styles.buttonLg);
    
    if (disabled) {
      baseStyle.push(styles.buttonDisabled);
    } else {
      if (variant === 'primary') baseStyle.push(styles.buttonPrimary);
      if (variant === 'secondary') baseStyle.push(styles.buttonSecondary);
      if (variant === 'danger') baseStyle.push(styles.buttonDanger);
      if (variant === 'outline') baseStyle.push(styles.buttonOutline);
      if (variant === 'ghost') baseStyle.push(styles.buttonGhost);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle: TextStyle[] = [styles.text];
    
    if (size === 'sm') baseStyle.push(styles.textSm);
    if (size === 'md') baseStyle.push(styles.textMd);
    if (size === 'lg') baseStyle.push(styles.textLg);
    
    if (disabled) {
      baseStyle.push(styles.textDisabled);
    } else {
      if (variant === 'outline' || variant === 'ghost') {
        baseStyle.push(styles.textPrimary);
      } else {
        baseStyle.push(styles.textWhite);
      }
    }
    
    return baseStyle;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.8}
      {...props}
    >
      {loading && (
        <ActivityIndicator 
          color={variant === 'outline' || variant === 'ghost' ? '#FF6B6B' : 'white'} 
          style={styles.loader}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginVertical: 6,
  },
  buttonSm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonMd: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonLg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  buttonPrimary: {
    backgroundColor: '#FF6B6B',
  },
  buttonSecondary: {
    backgroundColor: '#4ECDC4',
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  textSm: {
    fontSize: 14,
  },
  textMd: {
    fontSize: 16,
  },
  textLg: {
    fontSize: 18,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textPrimary: {
    color: '#FF6B6B',
  },
  textDisabled: {
    color: '#9CA3AF',
  },
  loader: {
    marginRight: 8,
  },
});

