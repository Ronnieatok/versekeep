import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { T, FONTS } from '../../constants/theme';

type TabIconProps = {
  focused: boolean;
  icon:    string;
  label:   string;
};

function TabIcon({ focused, icon, label }: TabIconProps) {
  return (
    <View style={s.wrapper}>
      {/* Red indicator bar above active tab */}
      {focused && <View style={s.indicator} />}
      <AppIcon name={icon} size={20} color={focused ? T.red : T.creamMute} />
      <Text style={[s.label, focused && s.labelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:     false,
        tabBarStyle:     s.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="home-outline" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Write',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="create-outline" label="Write" />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="bookmark-outline" label="Vault" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="search-outline" label="Search" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="person-outline" label="Profile" />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor:  T.surface,
    borderTopColor:   T.border,
    borderTopWidth:   0.5,
    height:           Platform.OS === 'web' ? 74 : 84,
    paddingBottom:    Platform.OS === 'web' ? 8 : 10,
    paddingTop:       6,
  },
  wrapper: {
    alignItems:    'center',
    justifyContent:'center',
    gap:            2,
    paddingTop:     6,
    position:      'relative',
  },
  indicator: {
    position:        'absolute',
    top:             -4,
    width:           20,
    height:          2.5,
    backgroundColor: T.red,
    borderRadius:    2,
  },
  label:       {
    fontSize:      9,
    color:         T.creamMute,
    fontFamily:    FONTS.body,
    fontWeight:    '400',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  labelActive: {
    color:      T.red,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },
});
