import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';

import AdminDrawerContent from './AdminDrawerContent';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminFoodsScreen from '../screens/admin/AdminFoodsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import { COLORS } from '../utils/theme';

export type AdminDrawerParamList = {
  AdminDashboard: undefined;
  AdminOrders: undefined;
  AdminFoods: undefined;
  AdminUsers: undefined;
  AdminSettings: undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

// Cast helper: stops a screen's own Props route name from conflicting with the navigator
const asScreen = (c: React.ComponentType<any>) => c as React.ComponentType<{}>;

const AdminDrawerNavigator: React.FC = () => {
  return (
    <Drawer.Navigator
      initialRouteName="AdminDashboard"
      drawerContent={(props: DrawerContentComponentProps) => (
        <AdminDrawerContent {...props} />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 280, backgroundColor: COLORS.white },
        overlayColor: 'rgba(0,0,0,0.5)',
        swipeEdgeWidth: 80,
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={asScreen(AdminDashboardScreen)}
        options={{ title: 'Dashboard' }}
      />
      <Drawer.Screen
        name="AdminOrders"
        component={asScreen(AdminOrdersScreen)}
        options={{ title: 'Orders' }}
      />
      <Drawer.Screen
        name="AdminFoods"
        component={asScreen(AdminFoodsScreen)}
        options={{ title: 'Foods' }}
      />
      <Drawer.Screen
        name="AdminUsers"
        component={asScreen(AdminUsersScreen)}
        options={{ title: 'Users' }}
      />
      <Drawer.Screen
        name="AdminSettings"
        component={asScreen(AdminSettingsScreen)}
        options={{ title: 'Settings' }}
      />
    </Drawer.Navigator>
  );
};

export default AdminDrawerNavigator;