import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabRoute {
  key: string;
  name: string;
  title: string;
}

interface ModernBottomTabBarProps {
  state: {
    index: number;
    routes: TabRoute[];
  };
  navigation: any;
  descriptors: Record<string, any>;
}

// Icon mapping for tab routes
const getIconName = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
  const icons: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
    parent: { active: 'grid', inactive: 'grid-outline' },
    child: { active: 'checkmark-circle', inactive: 'checkmark-circle-outline' },
    family: { active: 'people', inactive: 'people-outline' },
    profile: { active: 'person', inactive: 'person-outline' },
  };
  
  const iconSet = icons[routeName] || { active: 'ellipse', inactive: 'ellipse-outline' };
  return focused ? iconSet.active : iconSet.inactive;
};

// Get display label for tab
const getTabLabel = (routeName: string): string => {
  const labels: Record<string, string> = {
    parent: 'Dashboard',
    child: 'Chores',
    family: 'Family',
    profile: 'Profile',
  };
  return labels[routeName] || routeName;
};

// Single Tab Item with glowing pill indicator
const TabItem = ({
  route,
  focused,
  onPress,
}: {
  route: TabRoute;
  focused: boolean;
  onPress: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;
  
  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: focused ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused]);
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };
  
  const iconName = getIconName(route.name, focused);
  const label = getTabLabel(route.name);
  
  // Premium orange glow for Dashboard, neutral for others
  const isDashboard = route.name === 'parent';
  const activeColor = isDashboard ? '#FF6B35' : '#FF6B35';
  const inactiveColor = '#9CA3AF';
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={styles.tabItem}
    >
      <Animated.View
        style={[
          styles.tabContent,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Glowing pill indicator underneath active tab */}
        {focused && (
          <Animated.View
            style={[
              styles.glowingPill,
              {
                opacity: glowAnim,
                backgroundColor: activeColor,
                shadowColor: activeColor,
              },
            ]}
          />
        )}
        
        <View style={styles.iconContainer}>
          <Ionicons
            name={iconName}
            size={26}
            color={focused ? activeColor : inactiveColor}
          />
        </View>
        
        <Text
          style={[
            styles.tabLabel,
            { color: focused ? activeColor : inactiveColor },
            focused && styles.tabLabelActive,
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function ModernBottomTabBar({
  state,
  navigation,
  descriptors,
}: ModernBottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Filter out hidden tabs
  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];
    return options.href !== null;
  });
  
  if (visibleRoutes.length === 0) {
    return null;
  }
  
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Heavy blur background */}
      <BlurView
        intensity={80}
        tint="light"
        style={styles.blurBackground}
      />
      
      {/* Glassmorphism overlay */}
      <View style={styles.glassOverlay} />
      
      {/* Tab items */}
      <View style={styles.tabsContainer}>
        {visibleRoutes.map((route) => {
          const focused = state.routes[state.index]?.name === route.name;
          
          return (
            <TabItem
              key={route.key}
              route={route}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.8)',
    // Inner shadow effect
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 8,
    paddingBottom: 4,
    minWidth: 60,
  },
  glowingPill: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 4,
    borderRadius: 2,
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});
