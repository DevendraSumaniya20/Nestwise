import { type BottomTabBarButtonProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DoorOpen, House, ListChecks, UtensilsCrossed, Wallet, type LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Touchable } from '../components';
import { font, iconSize, ms } from '../constants';
import { useColors } from '../hooks';
import { useT, type Strings } from '../i18n';
import { FlatScreen, FoodScreen, HomeScreen, MoneyScreen, TasksScreen } from '../screens';

const Tab = createBottomTabNavigator();

function TabButton({ ref: _ref, ...props }: BottomTabBarButtonProps) {
  return <Touchable {...props} pressScale={0.92} />;
}

const tabIcon =
  (Svg: LucideIcon) =>
  ({ color, focused }: { color: string; focused: boolean }) =>
    <Svg size={iconSize.md} color={color} strokeWidth={focused ? 2.4 : 2} />;

const TABS: { key: keyof Strings['tabs']; icon: LucideIcon; component: React.ComponentType }[] = [
  { key: 'home', icon: House, component: HomeScreen },
  { key: 'money', icon: Wallet, component: MoneyScreen },
  { key: 'food', icon: UtensilsCrossed, component: FoodScreen },
  { key: 'tasks', icon: ListChecks, component: TasksScreen },
  { key: 'flat', icon: DoorOpen, component: FlatScreen },
];

export function RootTabs() {
  const c = useColors();
  const t = useT();

  return (
    <Tab.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'shift',
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.muted,
          tabBarLabelStyle: { fontFamily: font.semibold, fontSize: ms(11) },
          tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
          // Same ripple + squeeze as the rest of the app, on both platforms.
          tabBarButton: TabButton,
        }}
      >
        {TABS.map(({ key, icon: Svg, component }) => (
          <Tab.Screen
            key={key}
            name={key}
            component={component}
            options={{
              title: t.tabs[key],
              tabBarButtonTestID: `tab-${key}`,
              tabBarIcon: tabIcon(Svg),
            }}
          />
        ))}
    </Tab.Navigator>
  );
}
