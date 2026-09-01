import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { T, FONTS } from '../../constants/theme';

type TabIconProps = {
  focused: boolean;
  emoji:   string;
  label:   string;
};

function TabIcon({ focused, emoji, label }: TabIconProps) {
  return (
    <View style={s.wrapper}>
      {/* Red indicator bar above active tab */}
      {focused && <View style={s.indicator} />}
      <Text style={s.emoji}>{emoji}</Text>
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
            <TabIcon focused={focused} emoji="🏠" label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="write"
        options={{
          title: 'Write',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="✍️" label="Write" />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🔖" label="Vault" />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="🔍" label="Search" />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} emoji="👤" label="Profile" />
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
    height:           64,
    paddingBottom:    10,
    paddingTop:       4,
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
  emoji:       { fontSize: 19 },
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
